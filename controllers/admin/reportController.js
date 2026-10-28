'use strict';

const Report = require('../../models/admin/Report');
const Transaction = require('../../models/admin/Transaction');
const Session = require('../../models/admin/Session');
const Provider = require('../../models/admin/Provider');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const platformSummary = asyncHandler(async (req, res) => {
  const [providers, transactions, sessions] = await Promise.all([
    Provider.countDocuments(),
    Transaction.countDocuments({ status: 'completed' }),
    Session.countDocuments(),
  ]);
  return success(res, { providers, transactions, sessions });
});

const dailyReports = asyncHandler(async (req, res) => {
  const { providerId, from, to, page = 1, limit = 31 } = req.query;
  const filter = { type: 'daily' };
  if (providerId) filter.providerId = providerId;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const reports = await Report.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit));
  return success(res, reports);
});

const providerRevenue = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = { status: 'completed' };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$providerId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const providerIds = rows.map((r) => r._id).filter(Boolean);
  const providers = await Provider.find({ _id: { $in: providerIds } }, 'name email').lean();
  const byId = new Map(providers.map((p) => [String(p._id), p]));

  return success(res, rows.map((r) => ({
    providerId: r._id,
    provider: byId.get(String(r._id)) || null,
    total: r.total,
    transactions: r.count,
  })));
});

module.exports = { platformSummary, dailyReports, providerRevenue };