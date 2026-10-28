'use strict';

const Transaction = require('../../models/admin/Transaction');
const PendingProvider = require('../../models/admin/PendingProvider');
const Admin = require('../../models/admin/Admin');
const Provider = require('../../models/admin/Provider');
const Invoice = require('../../models/admin/Invoice');
const BillingPlan = require('../../models/admin/BillingPlan');
const Customer = require('../../models/provider/Customer');
const Plan = require('../../models/provider/Plan');
const Voucher = require('../../models/provider/Voucher');
const mpesaService = require('../../services/mpesaService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const notificationService = require('../../services/notificationService');
const { activateProviderPlan } = require('../../services/subscriptionService');
const config = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const { generateVoucherCode } = require('../../utils/voucherCode');

function validityMs(plan) {
  const unit = plan.validityUnit;
  const value = plan.validityValue;
  const map = { minutes: 60000, hours: 3600000, days: 86400000, months: 2592000000 };
  return value * (map[unit] || 86400000);
}

async function markTransactionCompleted(tx, parsed, req) {
  tx.status = 'completed';
  tx.mpesaReceiptNumber = parsed.mpesaReceiptNumber;
  tx.resultCode = parsed.resultCode;
  tx.resultDesc = parsed.resultDesc;
  tx.rawCallback = req.body;
  await tx.save();
}

async function markTransactionFailed(tx, parsed, req) {
  tx.status = parsed.resultCode === '1032' ? 'cancelled' : 'failed';
  tx.resultCode = parsed.resultCode;
  tx.resultDesc = parsed.resultDesc;
  tx.rawCallback = req.body;
  await tx.save();
}

async function issueVoucherForPurchase(tx, receiptNumber) {
  const provider = await Provider.findById(tx.providerId).lean();
  if (!provider) return null;

  const plan = await Plan.findById(tx.planId).lean();
  if (!plan) return null;

  const phone = tx.phone;
  const existing = await Customer.findOne({
    providerId: tx.providerId,
    $or: [{ phone }, { username: `v_${phone}` }],
  });

  let customer;
  if (existing) {
    existing.planId = plan._id;
    existing.expiresAt = new Date(Date.now() + validityMs(plan));
    existing.status = 'active';
    if (!existing.phone) existing.phone = phone;
    await existing.save();
    customer = existing;
  } else {
    customer = await Customer.create({
      providerId: tx.providerId,
      planId: plan._id,
      username: `v_${phone}`,
      phone,
      status: 'active',
      expiresAt: new Date(Date.now() + validityMs(plan)),
    });
  }

  const code = generateVoucherCode();
  const voucher = await Voucher.create({
    providerId: tx.providerId,
    planId: plan._id,
    code,
    status: 'used',
    usedByCustomerId: customer._id,
    usedAt: new Date(),
    expiresAt: new Date(Date.now() + validityMs(plan)),
    batchId: `auto_${receiptNumber || tx._id}`,
  });

  await Transaction.updateOne(
    { _id: tx._id },
    { $set: { customerId: customer._id, voucherId: voucher._id } }
  );

  const expiresAt = voucher.expiresAt.toISOString().slice(0, 10);

  try {
    if (customer.email) {
      emailService
        .sendVoucherPurchase({
          to: customer.email,
          voucherCode: code,
          planName: plan.name,
          expiresAt,
          providerId: provider._id,
          providerDoc: provider,
        })
        .catch(() => {});
    }

    if (customer.phone) {
      smsService
        .sendVoucherReady({
          to: customer.phone,
          voucherCode: code,
          planName: plan.name,
          providerId: provider._id,
          providerDoc: provider,
        })
        .catch(() => {});
    }
  } catch (err) {
    console.error('[webhook] voucher notification failed:', err.message);
  }

  return { customer, plan, voucher, provider };
}

async function handleCustomerPurchase(tx, parsed, req) {
  await markTransactionCompleted(tx, parsed, req);

  const issued = await issueVoucherForPurchase(tx, parsed.mpesaReceiptNumber);
  if (!issued) {
    console.warn('[webhook] customer purchase: plan or provider missing', {
      transactionId: String(tx._id),
    });
    return;
  }

  try {
    notificationService
      .notifyProvider(issued.provider.userId, {
        type: 'customer_purchase',
        title: 'New customer purchase',
        body: `${issued.customer.username} bought ${issued.plan.name} (${tx.currency} ${tx.amount}).`,
        link: `/customers/${issued.customer._id}`,
        meta: {
          transactionId: tx._id,
          customerId: issued.customer._id,
          planId: issued.plan._id,
        },
      })
      .catch(() => {});
  } catch (err) {
    console.error('[webhook] purchase notification failed:', err.message);
  }
}

async function handlePendingProviderPayment(tx, parsed, req) {
  await markTransactionCompleted(tx, parsed, req);

  const pending = await PendingProvider.findOne({ transactionId: tx._id }).populate('billingPlanId');
  if (!pending) return;

  pending.status = 'awaiting_approval';
  pending.paidAt = new Date();
  await pending.save();

  try {
    emailService
      .sendPaymentReceived({
        to: pending.email,
        providerName: pending.businessName || pending.name,
        invoiceNumber: tx._id.toString(),
        amount: parsed.amount || tx.amount,
        currency: tx.currency || 'KES',
        receiptNumber: parsed.mpesaReceiptNumber,
        paidAt: new Date(),
      })
      .catch(() => {});

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
                amount: parsed.amount || tx.amount,
                currency: tx.currency || 'KES',
                receiptNumber: parsed.mpesaReceiptNumber,
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
        type: 'provider_payment_received',
        title: 'Provider payment received',
        body: `${pending.businessName || pending.name} paid. Awaiting approval.`,
        link: `/providers/pending/${pending._id}`,
        meta: { pendingProviderId: pending._id, transactionId: tx._id },
      })
      .catch(() => {});
  } catch (err) {
    console.error('[webhook] pending provider notifications failed:', err.message);
  }
}

async function handleInvoicePayment(tx, parsed, req) {
  await markTransactionCompleted(tx, parsed, req);

  const invoice = await Invoice.findById(tx.invoiceId);
  if (!invoice) return;
  if (invoice.status === 'paid') return;

  invoice.status = 'paid';
  invoice.amountPaid = tx.amount;
  invoice.amountDue = Math.max(0, invoice.total - tx.amount);
  invoice.paidAt = new Date();
  await invoice.save();

  const provider = await Provider.findById(tx.providerId);
  if (!provider) return;

  const planId = invoice.items?.[0]?.productId;
  if (!planId) return;

  const billingPlan = await BillingPlan.findById(planId);
  if (!billingPlan) return;

  let activation;
  try {
    activation = await activateProviderPlan(provider, billingPlan, { sendEmails: true });
  } catch (err) {
    console.error('[webhook] activation failed:', err.message);
    return;
  }

  try {
    emailService
      .sendPaymentReceived({
        to: provider.email,
        providerName: provider.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: tx.amount,
        currency: tx.currency || invoice.currency,
        receiptNumber: parsed.mpesaReceiptNumber,
        paidAt: new Date(),
      })
      .catch(() => {});

    notificationService
      .notifyAdmins({
        type: 'provider_payment_received',
        title: invoice.purpose === 'renewal' ? 'Renewal payment received' : 'Upgrade payment received',
        body: `${provider.name} paid ${invoice.currency} ${invoice.total} for ${billingPlan.name}.`,
        link: '/billing/upgrade-payments',
        meta: {
          invoiceId: invoice._id,
          providerId: provider._id,
          transactionId: tx._id,
        },
      })
      .catch(() => {});
  } catch (err) {
    console.error('[webhook] invoice notifications failed:', err.message);
  }
}

async function handleProviderUpgrade(tx, parsed, req) {
  await markTransactionCompleted(tx, parsed, req);

  const provider = await Provider.findById(tx.providerId);
  if (!provider) return;

  const billingPlan = tx.planId ? await BillingPlan.findById(tx.planId) : null;
  if (!billingPlan) return;

  try {
    await activateProviderPlan(provider, billingPlan, { sendEmails: true });
  } catch (err) {
    console.error('[webhook] upgrade activation failed:', err.message);
  }
}

const mpesaCallback = asyncHandler(async (req, res) => {
  if (!mpesaService.isSafaricomIp(req.ip)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const parsed = mpesaService.parseCallback(req.body);
  if (!parsed.checkoutRequestId) {
    return res.status(200).json({ success: true });
  }

  if (mpesaService.isDuplicateCallback(parsed.checkoutRequestId)) {
    return res.status(200).json({ success: true });
  }

  const tx = await Transaction.findOne({ checkoutRequestId: parsed.checkoutRequestId });
  if (!tx) return res.status(200).json({ success: true });

  if (!parsed.success) {
    await markTransactionFailed(tx, parsed, req);

    if (tx.kind === 'customer_purchase' && tx.phone) {
      try {
        smsService
          .sendPaymentFailed({
            to: tx.phone,
            reason: parsed.resultDesc || 'Payment failed',
            providerId: tx.providerId,
          })
          .catch(() => {});
      } catch (err) {
        console.error('[webhook] payment failed sms dispatch failed:', err.message);
      }
    }

    return res.status(200).json({ success: true });
  }

  if (parsed.mpesaReceiptNumber) {
    const dupe = await Transaction.findOne({ mpesaReceiptNumber: parsed.mpesaReceiptNumber });
    if (dupe && String(dupe._id) !== String(tx._id)) {
      return res.status(200).json({ success: true });
    }
  }

  try {
    if (tx.kind === 'provider_subscription') {
      const pending = await PendingProvider.findOne({ transactionId: tx._id });
      if (pending) {
        await handlePendingProviderPayment(tx, parsed, req);
      } else if (tx.invoiceId) {
        await handleInvoicePayment(tx, parsed, req);
      } else {
        await handleProviderUpgrade(tx, parsed, req);
      }
    } else {
      await handleCustomerPurchase(tx, parsed, req);
    }
  } catch (err) {
    console.error('[webhook] post-processing failed:', err.message, {
      transactionId: String(tx._id),
      checkoutRequestId: parsed.checkoutRequestId,
    });
  }

  return res.status(200).json({ success: true });
});

module.exports = { mpesaCallback };