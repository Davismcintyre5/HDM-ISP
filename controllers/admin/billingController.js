'use strict';

const Transaction = require('../../models/admin/Transaction');
const PendingProvider = require('../../models/admin/PendingProvider');
const Provider = require('../../models/admin/Provider');
const Invoice = require('../../models/admin/Invoice');
const BillingPlan = require('../../models/admin/BillingPlan');
const Admin = require('../../models/admin/Admin');
const ApiError = require('../../utils/apiError');
const { success, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');
const emailService = require('../../services/emailService');
const notificationService = require('../../services/notificationService');
const { activateProviderPlan } = require('../../services/subscriptionService');

const listTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, providerId, phone, from, to, kind } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (providerId) filter.providerId = providerId;
  if (kind) filter.kind = kind;
  if (phone) filter.phone = { $regex: String(phone), $options: 'i' };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return paginated(res, items, {
    page: Number(page),
    limit: Number(limit),
    total,
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) throw ApiError.notFound('Transaction not found');
  return success(res, tx);
});

const listPendingPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const pendingTx = await Transaction.find({
    status: 'pending',
    kind: 'provider_subscription',
    resultCode: 'MANUAL',
    invoiceId: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .lean();

  const invoiceIds = pendingTx.map((t) => t.invoiceId).filter(Boolean);
  const providerIds = pendingTx.map((t) => t.providerId).filter(Boolean);

  const [invoices, providers] = await Promise.all([
    Invoice.find({ _id: { $in: invoiceIds } }).lean(),
    Provider.find({ _id: { $in: providerIds } }, 'name email phone status').lean(),
  ]);

  const invoiceMap = new Map(invoices.map((i) => [String(i._id), i]));
  const providerMap = new Map(providers.map((p) => [String(p._id), p]));

  const enriched = pendingTx.map((tx) => ({
    transaction: {
      id: tx._id,
      amount: tx.amount,
      currency: tx.currency,
      phone: tx.phone,
      status: tx.status,
      resultCode: tx.resultCode,
      resultDesc: tx.resultDesc,
      reference: tx.rawCallback?.reference || null,
      note: tx.rawCallback?.note || null,
      submittedAt: tx.rawCallback?.submittedAt || tx.createdAt,
    },
    invoice: tx.invoiceId ? invoiceMap.get(String(tx.invoiceId)) : null,
    provider: tx.providerId ? providerMap.get(String(tx.providerId)) : null,
  }));

  const skip = (Number(page) - 1) * Number(limit);
  const paginatedItems = enriched.slice(skip, skip + Number(limit));

  return paginated(res, paginatedItems, {
    page: Number(page),
    limit: Number(limit),
    total: enriched.length,
  });
});

const confirmPayment = asyncHandler(async (req, res) => {
  const { transactionId, receiptNumber, notes } = req.body;
  if (!transactionId) throw ApiError.badRequest('transactionId required');

  const tx = await Transaction.findById(transactionId);
  if (!tx) throw ApiError.notFound('Transaction not found');
  if (tx.status === 'completed') throw ApiError.badRequest('Transaction already completed');
  if (tx.status === 'failed' || tx.status === 'cancelled') {
    throw ApiError.badRequest(`Cannot confirm from status "${tx.status}"`);
  }

  if (receiptNumber) {
    const dupe = await Transaction.findOne({ mpesaReceiptNumber: receiptNumber });
    if (dupe && String(dupe._id) !== String(tx._id)) {
      throw ApiError.conflict('Receipt number already used by another transaction');
    }
  }

  tx.status = 'completed';
  tx.resultCode = '0';
  tx.resultDesc = notes || 'Confirmed by admin';
  if (receiptNumber) tx.mpesaReceiptNumber = receiptNumber;
  await tx.save();

  const pending = await PendingProvider.findOne({ transactionId: tx._id }).populate('billingPlanId');
  if (pending && pending.status !== 'approved') {
    pending.status = 'awaiting_approval';
    pending.paidAt = new Date();
    await pending.save();

    try {
      emailService
        .sendPaymentReceived({
          to: pending.email,
          providerName: pending.businessName || pending.name,
          invoiceNumber: tx._id.toString(),
          amount: tx.amount,
          currency: tx.currency || 'KES',
          receiptNumber: tx.mpesaReceiptNumber || null,
          paidAt: new Date(),
        })
        .catch((err) =>
          console.error('[confirmPayment] provider email failed:', err.message)
        );

      Admin.find({ status: 'active' }, 'email')
        .lean()
        .then((admins) =>
          Promise.allSettled(
            admins.map((a) =>
              emailService
                .sendAdminPaymentReceived({
                  to: a.email,
                  providerName: pending.businessName || pending.name,
                  providerEmail: pending.email,
                  invoiceNumber: tx._id.toString(),
                  planName: pending.billingPlanId?.name || 'Plan',
                  amount: tx.amount,
                  currency: tx.currency || 'KES',
                  receiptNumber: tx.mpesaReceiptNumber || null,
                  paidAt: new Date(),
                  reviewUrl: `${config.adminUrl}/providers/pending/${pending._id}`,
                })
                .catch(() => {})
            )
          )
        )
        .catch(() => {});

      notificationService
        .notifyAdmins({
          type: 'provider_payment_confirmed',
          title: 'Payment confirmed',
          body: `${pending.businessName || pending.name} paid. Awaiting approval.`,
          link: `/providers/pending/${pending._id}`,
          meta: { pendingProviderId: pending._id, transactionId: tx._id },
        })
        .catch(() => {});
    } catch (err) {
      console.error('[confirmPayment] pending notifications failed:', err.message);
    }

    return success(res, { transaction: tx, pending });
  }

  if (tx.invoiceId) {
    const invoice = await Invoice.findById(tx.invoiceId);
    if (invoice && invoice.status !== 'paid') {
      invoice.status = 'paid';
      invoice.amountPaid = tx.amount;
      invoice.amountDue = Math.max(0, invoice.total - tx.amount);
      invoice.paidAt = new Date();
      await invoice.save();

      const provider = await Provider.findById(tx.providerId);
      const planId = invoice.items?.[0]?.productId;
      const billingPlan = planId ? await BillingPlan.findById(planId) : null;

      if (provider && billingPlan) {
        try {
          await activateProviderPlan(provider, billingPlan, { sendEmails: true });
        } catch (err) {
          console.error('[confirmPayment] activation failed:', err.message);
        }

        try {
          emailService
            .sendPaymentReceived({
              to: provider.email,
              providerName: provider.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: tx.amount,
              currency: tx.currency || invoice.currency,
              receiptNumber: tx.mpesaReceiptNumber || null,
              paidAt: new Date(),
            })
            .catch(() => {});
        } catch (err) {
          console.error('[confirmPayment] receipt email failed:', err.message);
        }
      }
    }

    return success(res, { transaction: tx, invoice });
  }

  return success(res, { transaction: tx });
});

const rejectPayment = asyncHandler(async (req, res) => {
  const { transactionId, reason } = req.body;
  if (!transactionId) throw ApiError.badRequest('transactionId required');

  const tx = await Transaction.findById(transactionId);
  if (!tx) throw ApiError.notFound('Transaction not found');
  if (tx.status !== 'pending') {
    throw ApiError.badRequest(`Cannot reject from status "${tx.status}"`);
  }

  tx.status = 'failed';
  tx.resultCode = 'REJECTED';
  tx.resultDesc = reason || 'Rejected by admin';
  await tx.save();

  if (tx.invoiceId) {
    const invoice = await Invoice.findById(tx.invoiceId);
    if (invoice && invoice.status !== 'paid' && invoice.status !== 'cancelled') {
      await Invoice.updateOne({ _id: invoice._id }, { $set: { status: 'sent' } });
    }
  }

  return success(res, tx);
});

const listUpgradePayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = 'paid', purpose } = req.query;

  const filter = {
    purpose: { $in: purpose ? [purpose] : ['upgrade', 'renewal'] },
  };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .populate('providerId', 'name email phone status billingStatus')
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return paginated(res, items, {
    page: Number(page),
    limit: Number(limit),
    total,
  });
});

const summary = asyncHandler(async (req, res) => {
  const [pending, completed, failed, sentInvoices, overdueInvoices] = await Promise.all([
    Transaction.countDocuments({ status: 'pending' }),
    Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Transaction.countDocuments({ status: 'failed' }),
    Invoice.countDocuments({ status: 'sent' }),
    Invoice.countDocuments({ status: 'overdue' }),
  ]);

  const c = completed[0] || { total: 0, count: 0 };

  return success(res, {
    pendingTransactions: pending,
    completedTransactions: c.count,
    completedRevenue: c.total,
    failedTransactions: failed,
    unpaidInvoices: sentInvoices,
    overdueInvoices,
  });
});

module.exports = {
  listTransactions,
  getTransaction,
  listPendingPayments,
  confirmPayment,
  rejectPayment,
  listUpgradePayments,
  summary,
};