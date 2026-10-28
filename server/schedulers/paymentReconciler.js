'use strict';

const Transaction = require('../models/admin/Transaction');
const mpesaService = require('../services/mpesaService');

const STUCK_MINUTES = 3;
const MAX_PER_RUN = 50;

module.exports = async function paymentReconciler() {
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60 * 1000);

  const pending = await Transaction.find({
    status: 'pending',
    checkoutRequestId: { $ne: null },
    createdAt: { $lt: cutoff },
  })
    .limit(MAX_PER_RUN)
    .lean();

  if (!pending.length) return;

  let reconciled = 0;
  for (const tx of pending) {
    try {
      const result = await mpesaService.querySTKStatus(tx.checkoutRequestId);
      if (!result.success) continue;

      if (result.resultCode === '0') {
        await Transaction.updateOne(
          { _id: tx._id, status: 'pending' },
          {
            $set: {
              status: 'completed',
              resultCode: result.resultCode,
              resultDesc: result.resultDesc,
            },
          }
        );
        reconciled++;
      } else if (
        result.resultCode !== '500.001.1001' &&
        result.resultCode !== '4999'
      ) {
        await Transaction.updateOne(
          { _id: tx._id, status: 'pending' },
          {
            $set: {
              status: 'failed',
              resultCode: result.resultCode,
              resultDesc: result.resultDesc,
            },
          }
        );
        reconciled++;
      }
    } catch (err) {
      console.error(`[paymentReconciler] ${tx.checkoutRequestId}:`, err.message);
    }
  }

  if (reconciled > 0) {
    console.log(`[paymentReconciler] reconciled ${reconciled}/${pending.length}`);
  }
};