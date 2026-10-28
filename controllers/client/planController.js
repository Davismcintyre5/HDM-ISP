'use strict';

const Plan = require('../../models/provider/Plan');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 50, status } = req.query;

  const filter = { providerId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Plan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Plan.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, providerId: req.user.providerId });
  if (!plan) throw ApiError.notFound('Plan not found');
  return success(res, plan);
});

const create = asyncHandler(async (req, res) => {
  const {
    name, type, price, currency, validityUnit, validityValue,
    rateLimitDownKbps, rateLimitUpKbps, dataCapMb,
  } = req.body;

  if (!name || !validityUnit || !validityValue) {
    throw ApiError.badRequest('name, validityUnit, validityValue required');
  }

  const exists = await Plan.findOne({ providerId: req.user.providerId, name });
  if (exists) throw ApiError.conflict('Plan with this name already exists');

  const plan = await Plan.create({
    providerId: req.user.providerId,
    name,
    type: type || 'hotspot',
    price: price ?? 0,
    currency: currency || 'KES',
    validityUnit,
    validityValue,
    rateLimitDownKbps: rateLimitDownKbps ?? 0,
    rateLimitUpKbps: rateLimitUpKbps ?? 0,
    dataCapMb: dataCapMb ?? 0,
    status: 'active',
  });

  return created(res, plan);
});

const update = asyncHandler(async (req, res) => {
  const allowed = [
    'name', 'type', 'price', 'currency', 'validityUnit', 'validityValue',
    'rateLimitDownKbps', 'rateLimitUpKbps', 'dataCapMb', 'status',
  ];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  if (!Object.keys(updates).length) throw ApiError.badRequest('Nothing to update');

  if (updates.name) {
    const dupe = await Plan.findOne({
      providerId: req.user.providerId,
      name: updates.name,
      _id: { $ne: req.params.id },
    });
    if (dupe) throw ApiError.conflict('Plan with this name already exists');
  }

  const plan = await Plan.findOneAndUpdate(
    { _id: req.params.id, providerId: req.user.providerId },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!plan) throw ApiError.notFound('Plan not found');
  return success(res, plan);
});

const remove = asyncHandler(async (req, res) => {
  const plan = await Plan.findOneAndUpdate(
    { _id: req.params.id, providerId: req.user.providerId },
    { $set: { status: 'archived' } },
    { new: true }
  );
  if (!plan) throw ApiError.notFound('Plan not found');
  return success(res, { archived: true, plan });
});

module.exports = { list, getOne, create, update, remove };