'use strict';

const Transaction = require('../../models/admin/Transaction');
const Session = require('../../models/admin/Session');
const Customer = require('../../models/provider/Customer');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const revenue = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { from, to } = req.query;

  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to) : new Date();

  const rows = await Transaction.aggregate([
    { $match: { providerId: providerId, status: 'completed', createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return success(res, rows.map((r) => ({ date: r._id, total: r.total, count: r.count })));
});

const sessions = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { from, to } = req.query;

  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to) : new Date();

  const rows = await Session.aggregate([
    { $match: { providerId: providerId, startTime: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        count: { $sum: 1 },
        bytesIn: { $sum: '$bytesIn' },
        bytesOut: { $sum: '$bytesOut' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return success(res, rows.map((r) => ({
    date: r._id,
    sessions: r.count,
    mbIn: Math.round((r.bytesIn || 0) / (1024 * 1024)),
    mbOut: Math.round((r.bytesOut || 0) / (1024 * 1024)),
  })));
});

const customers = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;

  const [total, active, expired, suspended] = await Promise.all([
    Customer.countDocuments({ providerId }),
    Customer.countDocuments({ providerId, status: 'active' }),
    Customer.countDocuments({ providerId, status: 'expired' }),
    Customer.countDocuments({ providerId, status: 'suspended' }),
  ]);

  return success(res, { total, active, expired, suspended });
});

module.exports = { revenue, sessions, customers };