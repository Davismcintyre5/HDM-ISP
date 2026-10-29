'use strict';

const Transaction = require('../models/admin/Transaction');
const mpesaService = require('../services/mpesaService');
const { resolveMpesaConfig } = require('../services/mpesaResolverService');
const config = require('../config/env');

const STUCK_MINUTES = 3;
const MAX_PER_RUN = 50;

const PLATFORM_DEFAULTS = {
  consumerKey: config.mpesa.consumerKey,
  consumerSecret: config.mpesa.consumerSecret,
  passkey: config.mpesa.passkey,
  shortcode: config.mpesa.shortCode,
  tillNumber: config.mpesa.tillNumber,
  transactionType: config.mpesa.transactionType,
  callbackUrl: config.mpesa.callbackUrl,
  baseUrl: config.mpesa.baseUrl,
};

async function configForTransaction(tx) {
  const mode = tx.mpesaMode || 'global';

  if (mode === 'global') {
    return {
      mode: 'global',
      ...PLATFORM_DEFAULTS,
      accountOwner: 'platform',
    };
  }

  if (mode === 'shared') {
    return {
      mode: 'shared',
      ...PLATFORM_DEFAULTS,
      shortcode: tx.mpesaShortcode || PLATFORM_DEFAULTS.shortcode,
      tillNumber: tx.mpesaTillNumber || '',
      accountOwner: 'provider',
    };
  }

  return resolveMpesaConfig(tx.providerId);
}

module.exports = async function paymentReconciler() {
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60 * 1000);

  const pending = await Transaction.find({
    status: 'pending',
    resultCode: { $ne: 'MANUAL' },
    checkoutRequestId: { $ne: null },
    createdAt: { $lt: cutoff },
  })
    .limit(MAX_PER_RUN)
    .lean();

  if (!pending.length) return;

  let reconciled = 0;

  for (const tx of pending) {
    try {
      let mpesaConfig;
      try {
        mpesaConfig = await configForTransaction(tx);
      } catch (err) {
        console.warn(
          `[paymentReconciler] config resolution failed for tx ${tx._id}:`,
          err.message
        );
        continue;
      }

      const result = await mpesaService.querySTKStatus(
        tx.checkoutRequestId,
        mpesaConfig
      );

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