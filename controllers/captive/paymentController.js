'use strict';

const Transaction = require('../../models/admin/Transaction');
const Plan = require('../../models/provider/Plan');
const Provider = require('../../models/admin/Provider');
const Voucher = require('../../models/provider/Voucher');
const Customer = require('../../models/provider/Customer');
const mpesaService = require('../../services/mpesaService');
const { resolveMpesaConfig, sanitizeForLog } = require('../../services/mpesaResolverService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const notificationService = require('../../services/notificationService');
const ApiError = require('../../utils/apiError');
const { success, created } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { generateVoucherCode } = require('../../utils/voucherCode');

function validityMs(plan) {
  const unit = plan.validityUnit;
  const value = plan.validityValue;
  const map = { minutes: 60000, hours: 3600000, days: 86400000, months: 2592000000 };
  return value * (map[unit] || 86400000);
}

async function issueVoucherForTransaction(tx, receiptNumber) {
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

    notificationService
      .notifyProvider(provider.userId, {
        type: 'customer_purchase',
        title: 'New customer purchase',
        body: `${customer.username} bought ${plan.name} (${tx.currency} ${tx.amount}).`,
        link: `/customers/${customer._id}`,
        meta: {
          transactionId: tx._id,
          customerId: customer._id,
          planId: plan._id,
        },
      })
      .catch(() => {});
  } catch (err) {
    console.error('[paymentController] voucher notification failed:', err.message);
  }

  return { customer, plan, voucher };
}

const initiateStk = asyncHandler(async (req, res) => {
  const { providerId, planId, phone } = req.body;
  if (!providerId || !planId || !phone) {
    throw ApiError.badRequest('providerId, planId, phone required');
  }

  const provider = await Provider.findById(providerId).lean();
  if (!provider) throw ApiError.notFound('Provider not found');
  if (provider.status === 'suspended') {
    throw ApiError.forbidden('Provider is not accepting payments right now');
  }

  const plan = await Plan.findOne({ _id: planId, providerId, status: 'active' }).lean();
  if (!plan) throw ApiError.notFound('Plan not found');

  const normalized = mpesaService.normalizePhone(phone);
  if (!normalized || normalized.length < 10) {
    throw ApiError.badRequest('Invalid phone number');
  }

  const mpesaConfig = await resolveMpesaConfig(provider._id);
  console.log('[payment] stk config:', sanitizeForLog(mpesaConfig));

  const accountRef = `WIFI-${String(providerId).slice(-6)}-${String(planId).slice(-6)}`;

  const result = await mpesaService.initiateSTKPush({
    phone: normalized,
    amount: plan.price,
    accountReference: accountRef,
    description: `${provider.name} ${plan.name}`,
    config: mpesaConfig,
  });

  if (!result.success) {
    throw ApiError.badGateway(
      result.error?.errorMessage || 'Failed to initiate STK push',
      { raw: result.error }
    );
  }

  const tx = await Transaction.create({
    providerId: provider._id,
    planId: plan._id,
    phone: normalized,
    amount: plan.price,
    currency: plan.currency || 'KES',
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    status: 'pending',
    kind: 'customer_purchase',
    mpesaMode: mpesaConfig.mode,
    mpesaShortcode: mpesaConfig.shortcode || null,
    mpesaTillNumber: mpesaConfig.tillNumber || null,
  });

  return created(res, {
    transactionId: tx._id,
    checkoutRequestId: result.checkoutRequestId,
    customerMessage: result.customerMessage,
    amount: plan.price,
    currency: plan.currency || 'KES',
    planName: plan.name,
  });
});

const paymentStatus = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;
  if (!checkoutRequestId) throw ApiError.badRequest('checkoutRequestId required');

  const tx = await Transaction.findOne({ checkoutRequestId }).lean();
  if (!tx) throw ApiError.notFound('Transaction not found');

  const mpesaConfig = await resolveMpesaConfig(tx.providerId);

  if (tx.status === 'pending') {
    const query = await mpesaService.querySTKStatus(checkoutRequestId, mpesaConfig);

    if (
      query.success &&
      query.resultCode !== '500.001.1001' &&
      query.resultCode !== '4999'
    ) {
      if (query.resultCode === '0') {
        const fresh = await Transaction.findOne({ checkoutRequestId });
        if (fresh && fresh.status === 'pending') {
          fresh.status = 'completed';
          fresh.resultCode = query.resultCode;
          fresh.resultDesc = query.resultDesc;
          await fresh.save();

          const issued = await issueVoucherForTransaction(fresh, null);

          return success(res, {
            status: 'completed',
            checkoutRequestId,
            voucherCode: issued?.voucher?.code || null,
            planName: issued?.plan?.name || null,
            expiresAt: issued?.voucher?.expiresAt || null,
          });
        }
      } else {
        const newStatus = query.resultCode === '1032' ? 'cancelled' : 'failed';
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
  }

  const fresh = await Transaction.findOne({ checkoutRequestId }).lean();

  if (fresh.status === 'completed') {
    let voucherCode = null;
    let planName = null;
    let expiresAt = null;

    if (fresh.voucherId) {
      const voucher = await Voucher.findById(fresh.voucherId).lean();
      if (voucher) {
        voucherCode = voucher.code;
        expiresAt = voucher.expiresAt;
      }
    }

    if (fresh.planId) {
      const plan = await Plan.findById(fresh.planId, 'name').lean();
      planName = plan?.name || null;
    }

    return success(res, {
      status: 'completed',
      checkoutRequestId,
      voucherCode,
      planName,
      expiresAt,
      mpesaReceiptNumber: fresh.mpesaReceiptNumber || null,
    });
  }

  return success(res, {
    status: fresh.status,
    checkoutRequestId,
    resultDesc: fresh.resultDesc || null,
  });
});

module.exports = { initiateStk, paymentStatus };