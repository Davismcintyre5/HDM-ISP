'use strict';

const Voucher = require('../models/provider/Voucher');
const Customer = require('../models/provider/Customer');
const Plan = require('../models/provider/Plan');
const config = require('../config/env');
const { generateVoucherCode } = require('../utils/voucherCode');
const ApiError = require('../utils/apiError');

async function generateBatch({ providerId, planId, count, expiresAt, batchId }) {
  const plan = await Plan.findOne({ _id: planId, providerId });
  if (!plan) throw ApiError.notFound('Plan not found');
  if (!count || count < 1 || count > 1000) {
    throw ApiError.badRequest('count must be 1..1000');
  }

  const expires = expiresAt
    ? new Date(expiresAt)
    : new Date(Date.now() + config.voucher.defaultExpiryDays * 86400000);

  const batch = batchId || `batch_${Date.now()}`;
  const codes = [];
  const docs = [];
  const seen = new Set();

  while (docs.length < count) {
    const code = generateVoucherCode();
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
    docs.push({
      providerId,
      planId,
      code,
      status: 'unused',
      expiresAt: expires,
      batchId: batch,
    });
  }

  await Voucher.insertMany(docs, { ordered: false });
  return { batchId: batch, count, codes, expiresAt: expires };
}

async function redeemVoucher({ code, macAddress, providerId }) {
  if (!code) throw ApiError.badRequest('Voucher code required');

  const filter = { code: String(code).trim().toUpperCase(), status: 'unused' };
  if (providerId) filter.providerId = providerId;

  const voucher = await Voucher.findOne(filter).populate('planId');
  if (!voucher) throw ApiError.notFound('Invalid or already used voucher');
  if (voucher.expiresAt < new Date()) {
    await Voucher.updateOne({ _id: voucher._id }, { $set: { status: 'expired' } });
    throw ApiError.badRequest('Voucher expired');
  }

  const plan = voucher.planId;
  const existing = macAddress
    ? await Customer.findOne({ providerId: voucher.providerId, macAddress })
    : null;

  let customer = existing;
  if (customer) {
    customer.planId = plan._id;
    customer.expiresAt = new Date(Date.now() + validityMs(plan));
    customer.status = 'active';
    await customer.save();
  } else {
    customer = await Customer.create({
      providerId: voucher.providerId,
      planId: plan._id,
      username: `v_${voucher.code.toLowerCase()}`,
      macAddress,
      status: 'active',
      expiresAt: new Date(Date.now() + validityMs(plan)),
    });
  }

  voucher.status = 'used';
  voucher.usedByCustomerId = customer._id;
  voucher.usedAt = new Date();
  await voucher.save();

  return { customer, plan, voucher };
}

function validityMs(plan) {
  const unit = plan.validityUnit;
  const value = plan.validityValue;
  const map = { minutes: 60000, hours: 3600000, days: 86400000, months: 2592000000 };
  return value * (map[unit] || 86400000);
}

async function expireStaleVouchers() {
  const result = await Voucher.updateMany(
    { status: 'unused', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
  return { expired: result.modifiedCount };
}

module.exports = {
  generateBatch,
  redeemVoucher,
  expireStaleVouchers,
  validityMs,
};