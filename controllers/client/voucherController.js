'use strict';

const Voucher = require('../../models/provider/Voucher');
const Plan = require('../../models/provider/Plan');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const voucherService = require('../../services/voucherService');

const list = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 50, status, batchId, planId, code } = req.query;

  const filter = { providerId };
  if (status) filter.status = status;
  if (batchId) filter.batchId = batchId;
  if (planId) filter.planId = planId;
  if (code) filter.code = { $regex: String(code).toUpperCase(), $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Voucher.find(filter)
      .populate('planId', 'name price currency')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Voucher.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const generate = asyncHandler(async (req, res) => {
  const { planId, count, expiresAt, batchId } = req.body;
  if (!planId || !count) throw ApiError.badRequest('planId and count required');

  const plan = await Plan.findOne({ _id: planId, providerId: req.user.providerId });
  if (!plan) throw ApiError.notFound('Plan not found');

  const batch = await voucherService.generateBatch({
    providerId: req.user.providerId,
    planId: plan._id,
    count: Number(count),
    expiresAt,
    batchId,
  });

  return created(res, batch);
});

const revoke = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findOneAndUpdate(
    { code: req.params.code, providerId: req.user.providerId, status: 'unused' },
    { $set: { status: 'revoked' } },
    { new: true }
  );
  if (!voucher) throw ApiError.notFound('Voucher not found or not revocable');
  return success(res, voucher);
});

module.exports = { list, generate, revoke };