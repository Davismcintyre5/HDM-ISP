'use strict';

const Transaction = require('../../models/admin/Transaction');
const { success, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/apiError');

const list = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 20, status, phone, from, to, kind } = req.query;

  const filter = { providerId };
  if (status) filter.status = status;
  if (kind) filter.kind = kind;
  if (phone) filter.phone = { $regex: String(phone), $options: 'i' };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Transaction.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  });
  if (!tx) throw ApiError.notFound('Transaction not found');
  return success(res, tx);
});

const summary = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const agg = await Transaction.aggregate([
    { $match: { providerId: providerId, status: 'completed', createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        total: { $sum: '$amount' },
      },
    },
  ]);

  return success(res, {
    last30Days: {
      completed: agg[0]?.count || 0,
      revenue: agg[0]?.total || 0,
    },
  });
});

module.exports = { list, getOne, summary };