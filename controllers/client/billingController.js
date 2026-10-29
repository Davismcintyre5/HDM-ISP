'use strict';

const Provider = require('../../models/admin/Provider');
const BillingPlan = require('../../models/admin/BillingPlan');
const Invoice = require('../../models/admin/Invoice');
const Transaction = require('../../models/admin/Transaction');
const invoiceService = require('../../services/invoiceService');
const emailService = require('../../services/emailService');
const mpesaService = require('../../services/mpesaService');
const { resolveMpesaConfig, sanitizeForLog } = require('../../services/mpesaResolverService');
const notificationService = require('../../services/notificationService');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');

const getCurrent = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.user.providerId)
    .populate('billingPlanId', 'name description price currency billingCycle trialDays features')
    .lean();
  if (!provider) throw ApiError.notFound('Provider not found');

  const now = new Date();
  const endsAt = provider.subscriptionEndsAt;
  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000)))
    : null;

  return success(res, {
    plan: provider.billingPlanId || null,
    billingStatus: provider.billingStatus,
    subscriptionEndsAt: provider.subscriptionEndsAt,
    daysLeft,
    isTrial: provider.billingPlanId?.billingCycle === 'trial',
    isExpired: Boolean(endsAt && endsAt < now),
    canRenew:
      Boolean(provider.billingPlanId) &&
      provider.billingPlanId.billingCycle === 'monthly',
  });
});

const getAvailablePlans = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.user.providerId).lean();
  if (!provider) throw ApiError.notFound('Provider not found');

  const currentPlan = provider.billingPlanId
    ? await BillingPlan.findById(provider.billingPlanId).lean()
    : null;

  const plans = await BillingPlan.find({
    status: 'active',
    billingCycle: { $in: ['monthly', 'onetime'] },
  })
    .select('name description price currency billingCycle trialDays features')
    .sort({ price: 1 })
    .lean();

  const currentPrice = currentPlan?.price || 0;
  const currentCycle = currentPlan?.billingCycle || 'trial';

  const enriched = plans.map((p) => {
    const isCurrent =
      currentPlan && String(p._id) === String(currentPlan._id);
    const isUpgrade =
      !isCurrent &&
      (p.price > currentPrice ||
        (p.price === currentPrice && p.billingCycle !== currentCycle));
    return { ...p, isCurrent, isUpgrade, canSelect: isUpgrade };
  });

  return success(res, enriched);
});

const initiateUpgrade = asyncHandler(async (req, res) => {
  const { billingPlanId } = req.body;
  if (!billingPlanId) throw ApiError.badRequest('billingPlanId required');

  const provider = await Provider.findById(req.user.providerId);
  if (!provider) throw ApiError.notFound('Provider not found');

  const plan = await BillingPlan.findById(billingPlanId);
  if (!plan || plan.status !== 'active') {
    throw ApiError.notFound('Billing plan not found');
  }
  if (plan.billingCycle === 'trial') {
    throw ApiError.badRequest('Cannot upgrade to a trial plan');
  }
  if (plan.price <= 0) {
    throw ApiError.badRequest('Plan has no price');
  }

  const isSame =
    provider.billingPlanId &&
    String(provider.billingPlanId) === String(plan._id);
  if (isSame && provider.billingStatus === 'active') {
    throw ApiError.badRequest('You are already on this plan');
  }

  await Invoice.updateMany(
    { providerId: provider._id, status: { $in: ['sent', 'overdue', 'draft'] } },
    { $set: { status: 'cancelled' } }
  );

  const { invoice, instructions } = await invoiceService.generateUpgradeInvoice({
    provider,
    plan,
    createdBy: provider.userId,
  });

  const payUrl = `${config.providerUrl}/billing/invoices/${invoice._id}`;

  try {
    emailService
      .sendInvoice({
        to: provider.email,
        providerName: provider.name,
        invoiceNumber: invoice.invoiceNumber,
        planName: plan.name,
        amount: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        issuedAt: invoice.issuedAt.toISOString().slice(0, 10),
        notes: invoice.notes,
        purpose: invoice.purpose,
        payUrl,
      })
      .catch((err) =>
        console.error('[billingController] upgrade invoice email failed:', err.message)
      );
  } catch (err) {
    console.error('[billingController] upgrade dispatch failed:', err.message);
  }

  return created(res, {
    invoice: {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      planName: plan.name,
      amount: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      purpose: invoice.purpose,
    },
    paymentInstructions: instructions,
    payUrl,
  });
});

const initiateRenewal = asyncHandler(async (req, res) => {
  const { billingPlanId } = req.body;

  const provider = await Provider.findById(req.user.providerId);
  if (!provider) throw ApiError.notFound('Provider not found');

  let plan;
  if (billingPlanId) {
    plan = await BillingPlan.findById(billingPlanId);
    if (!plan || plan.status !== 'active') {
      throw ApiError.notFound('Billing plan not found');
    }
  } else {
    plan = provider.billingPlanId
      ? await BillingPlan.findById(provider.billingPlanId)
      : null;
    if (!plan) throw ApiError.badRequest('No current plan to renew');
  }

  if (plan.billingCycle === 'trial') {
    throw ApiError.badRequest('Cannot renew a trial plan. Choose a paid plan.');
  }
  if (plan.billingCycle === 'onetime') {
    throw ApiError.badRequest('One-time plans never expire and cannot be renewed.');
  }
  if (plan.price <= 0) {
    throw ApiError.badRequest('Plan has no price');
  }

  await Invoice.updateMany(
    { providerId: provider._id, status: { $in: ['sent', 'overdue', 'draft'] } },
    { $set: { status: 'cancelled' } }
  );

  const { invoice, instructions } = await invoiceService.generateRenewalInvoice({
    provider,
    plan,
    createdBy: provider.userId,
  });

  const payUrl = `${config.providerUrl}/billing/invoices/${invoice._id}`;

  try {
    emailService
      .sendInvoice({
        to: provider.email,
        providerName: provider.name,
        invoiceNumber: invoice.invoiceNumber,
        planName: plan.name,
        amount: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        issuedAt: invoice.issuedAt.toISOString().slice(0, 10),
        notes: invoice.notes,
        purpose: invoice.purpose,
        payUrl,
      })
      .catch((err) =>
        console.error('[billingController] renewal invoice email failed:', err.message)
      );
  } catch (err) {
    console.error('[billingController] renewal dispatch failed:', err.message);
  }

  return created(res, {
    invoice: {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      planName: plan.name,
      amount: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      purpose: invoice.purpose,
    },
    paymentInstructions: instructions,
    payUrl,
  });
});

const listInvoices = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 20, status, purpose } = req.query;

  const filter = { providerId };
  if (status) filter.status = status;
  if (purpose) filter.purpose = purpose;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  const invoiceIds = items.map((i) => i._id);
  const pendingTxs = await Transaction.find({
    invoiceId: { $in: invoiceIds },
    status: 'pending',
  })
    .select('invoiceId rawCallback createdAt')
    .lean();

  const pendingMap = new Map();
  for (const tx of pendingTxs) {
    pendingMap.set(String(tx.invoiceId), {
      reference: tx.rawCallback?.reference || null,
      submittedAt: tx.rawCallback?.submittedAt || tx.createdAt,
    });
  }

  const enriched = items.map((i) => ({
    ...i,
    pendingManualPayment: pendingMap.get(String(i._id)) || null,
  }));

  return paginated(res, enriched, {
    page: Number(page),
    limit: Number(limit),
    total,
  });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  }).lean();
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const pendingTx = await Transaction.findOne({
    invoiceId: invoice._id,
    status: 'pending',
  }).lean();

  return success(res, {
    ...invoice,
    pendingTransaction: pendingTx
      ? {
          id: pendingTx._id,
          reference: pendingTx.rawCallback?.reference || null,
          note: pendingTx.rawCallback?.note || null,
          submittedAt: pendingTx.rawCallback?.submittedAt || pendingTx.createdAt,
        }
      : null,
  });
});

const payInvoiceStk = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw ApiError.badRequest('phone required');

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status === 'paid') throw ApiError.badRequest('Invoice already paid');
  if (invoice.status === 'cancelled') throw ApiError.badRequest('Invoice cancelled');

  const normalized = mpesaService.normalizePhone(phone);
  if (!normalized || normalized.length < 10) {
    throw ApiError.badRequest('Invalid phone number');
  }

  const mpesaConfig = await resolveMpesaConfig(req.user.providerId);
  console.log('[billing] stk config:', sanitizeForLog(mpesaConfig));

  const result = await mpesaService.initiateSTKPush({
    phone: normalized,
    amount: invoice.amountDue,
    accountReference: invoice.invoiceNumber,
    description: `Invoice ${invoice.invoiceNumber}`,
    config: mpesaConfig,
  });

  if (!result.success) {
    throw ApiError.badGateway(
      result.error?.errorMessage || 'Failed to initiate STK push',
      { raw: result.error }
    );
  }

  const tx = await Transaction.create({
    providerId: req.user.providerId,
    planId: invoice.items?.[0]?.productId || null,
    invoiceId: invoice._id,
    phone: normalized,
    amount: invoice.amountDue,
    currency: invoice.currency,
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    status: 'pending',
    kind: 'provider_subscription',
    mpesaMode: mpesaConfig.mode,
    mpesaShortcode: mpesaConfig.shortcode || null,
    mpesaTillNumber: mpesaConfig.tillNumber || null,
  });

  return created(res, {
    transactionId: tx._id,
    checkoutRequestId: result.checkoutRequestId,
    customerMessage: result.customerMessage,
    amount: invoice.amountDue,
    currency: invoice.currency,
  });
});

const markInvoicePaid = asyncHandler(async (req, res) => {
  const { reference, note } = req.body;

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status === 'paid') throw ApiError.badRequest('Invoice already paid');
  if (invoice.status === 'cancelled') throw ApiError.badRequest('Invoice cancelled');

  const existing = await Transaction.findOne({
    invoiceId: invoice._id,
    status: 'pending',
  });
  if (existing) {
    throw ApiError.conflict('Payment already submitted and awaiting admin confirmation');
  }

  const provider = await Provider.findById(req.user.providerId);

  const tx = await Transaction.create({
    providerId: req.user.providerId,
    planId: invoice.items?.[0]?.productId || null,
    invoiceId: invoice._id,
    phone: provider?.phone || 'unknown',
    amount: invoice.amountDue,
    currency: invoice.currency,
    status: 'pending',
    kind: 'provider_subscription',
    resultCode: 'MANUAL',
    resultDesc: 'Awaiting admin confirmation',
    rawCallback: {
      reference: reference || null,
      note: note || null,
      submittedAt: new Date(),
    },
  });

  await notificationService
    .notifyAdmins({
      type: 'manual_payment_submitted',
      title: 'Manual payment submitted',
      body: `${provider?.name || 'Provider'} marked invoice ${invoice.invoiceNumber} as paid. Reference: ${reference || 'none'}.`,
      link: '/billing/pending-payments',
      meta: {
        invoiceId: invoice._id,
        transactionId: tx._id,
        providerId: req.user.providerId,
      },
    })
    .catch(() => {});

  return created(res, {
    transactionId: tx._id,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amountDue,
    currency: invoice.currency,
    reference: reference || null,
    status: 'pending',
    message: 'Payment submitted. An admin will confirm it shortly.',
  });
});

const getInvoicePaymentStatus = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;
  if (!checkoutRequestId) throw ApiError.badRequest('checkoutRequestId required');

  const tx = await Transaction.findOne({
    checkoutRequestId,
    providerId: req.user.providerId,
  }).lean();
  if (!tx) throw ApiError.notFound('Transaction not found');

  if (tx.status === 'pending' && tx.resultCode !== 'MANUAL') {
    const mpesaConfig = await resolveMpesaConfig(tx.providerId);
    const query = await mpesaService.querySTKStatus(checkoutRequestId, mpesaConfig);

    if (
      query.success &&
      query.resultCode !== '500.001.1001' &&
      query.resultCode !== '4999'
    ) {
      const newStatus =
        query.resultCode === '0'
          ? 'completed'
          : query.resultCode === '1032'
          ? 'cancelled'
          : 'failed';

      await Transaction.updateOne(
        { _id: tx._id, status: 'pending' },
        {
          $set: {
            status: newStatus,
            resultCode: query.resultCode,
            resultDesc: query.resultDesc,
          },
        }
      );

      return success(res, {
        status: newStatus,
        checkoutRequestId,
        resultDesc: query.resultDesc,
      });
    }
  }

  return success(res, {
    status: tx.status,
    checkoutRequestId,
    resultDesc: tx.resultDesc || null,
    mpesaReceiptNumber: tx.mpesaReceiptNumber || null,
  });
});

const listTransactions = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 20 } = req.query;

  const filter = { providerId, kind: 'provider_subscription' };

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

module.exports = {
  getCurrent,
  getAvailablePlans,
  initiateUpgrade,
  initiateRenewal,
  listInvoices,
  getInvoice,
  payInvoiceStk,
  markInvoicePaid,
  getInvoicePaymentStatus,
  listTransactions,
};