'use strict';

const Voucher = require('../../models/provider/Voucher');
const Customer = require('../../models/provider/Customer');
const Plan = require('../../models/provider/Plan');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const voucherService = require('../../services/voucherService');

const redeem = asyncHandler(async (req, res) => {
  const { code, macAddress, providerId } = req.body;
  if (!code) throw ApiError.badRequest('Voucher code required');
  if (!macAddress) throw ApiError.badRequest('MAC address required');

  const result = await voucherService.redeemVoucher({
    code: String(code).trim().toUpperCase(),
    macAddress: String(macAddress).toLowerCase(),
    providerId: providerId || null,
  });

  return success(res, {
    redeemed: true,
    planName: result.plan.name,
    username: result.customer.username,
    expiresAt: result.customer.expiresAt,
    rateLimitDownKbps: result.plan.rateLimitDownKbps,
    rateLimitUpKbps: result.plan.rateLimitUpKbps,
  });
});

const validate = asyncHandler(async (req, res) => {
  const { code, providerId } = req.query;
  if (!code) throw ApiError.badRequest('Voucher code required');

  const filter = { code: String(code).trim().toUpperCase() };
  if (providerId) filter.providerId = providerId;

  const voucher = await Voucher.findOne(filter).populate('planId').lean();
  if (!voucher) return success(res, { valid: false, reason: 'not_found' });
  if (voucher.status !== 'unused') return success(res, { valid: false, reason: voucher.status });
  if (voucher.expiresAt < new Date()) return success(res, { valid: false, reason: 'expired' });

  return success(res, {
    valid: true,
    planName: voucher.planId?.name || null,
    price: voucher.planId?.price || null,
    currency: voucher.planId?.currency || 'KES',
    expiresAt: voucher.expiresAt,
  });
});

module.exports = { redeem, validate };