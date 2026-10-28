'use strict';

const Transaction = require('../models/admin/Transaction');
const Session = require('../models/admin/Session');
const Provider = require('../models/admin/Provider');
const Report = require('../models/admin/Report');

module.exports = async function reportAggregator() {
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const providers = await Provider.find({ status: 'active' }, '_id').lean();
  if (!providers.length) return;

  let aggregated = 0;
  for (const p of providers) {
    try {
      const txAgg = await Transaction.aggregate([
        {
          $match: {
            providerId: p._id,
            status: 'completed',
            createdAt: { $gte: yesterday, $lt: today },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
      ]);

      const sessionAgg = await Session.aggregate([
        {
          $match: {
            providerId: p._id,
            startTime: { $gte: yesterday, $lt: today },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            bytesIn: { $sum: '$bytesIn' },
            bytesOut: { $sum: '$bytesOut' },
          },
        },
      ]);

      const tx = txAgg[0] || { count: 0, total: 0 };
      const ss = sessionAgg[0] || { count: 0, bytesIn: 0, bytesOut: 0 };

      await Report.updateOne(
        {
          providerId: p._id,
          type: 'daily',
          date: yesterday,
        },
        {
          $set: {
            providerId: p._id,
            type: 'daily',
            date: yesterday,
            generatedAt: new Date(),
            data: {
              transactions: tx.count,
              revenue: tx.total,
              sessions: ss.count,
              bytesIn: ss.bytesIn,
              bytesOut: ss.bytesOut,
            },
          },
        },
        { upsert: true }
      );
      aggregated++;
    } catch (err) {
      console.error(`[reportAggregator] provider ${p._id}:`, err.message);
    }
  }

  if (aggregated > 0) {
    console.log(`[reportAggregator] ${aggregated} provider(s) aggregated`);
  }
};