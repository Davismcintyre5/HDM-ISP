'use strict';

const Customer = require('../models/provider/Customer');
const Plan = require('../models/provider/Plan');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

const WINDOW_HOURS = 24;
const MAX_PER_RUN = 100;

module.exports = async function notificationScheduler() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  const expiring = await Customer.find({
    status: 'active',
    expiresAt: { $gt: now, $lte: windowEnd },
    expiryWarnedAt: null,
  })
    .populate('planId')
    .limit(MAX_PER_RUN);

  if (!expiring.length) return;

  let sent = 0;
  for (const customer of expiring) {
    try {
      const plan = customer.planId;
      if (!plan) continue;

      const expiresAt = customer.expiresAt.toISOString().slice(0, 10);

      if (customer.email) {
        await emailService.sendExpiryWarning?.({
          to: customer.email,
          planName: plan.name,
          expiresAt,
          providerId: customer.providerId,
        }).catch(() => {});
      }

      if (customer.phone) {
        await smsService.sendExpiryWarning({
          to: customer.phone,
          planName: plan.name,
          expiresAt,
          providerId: customer.providerId,
        }).catch(() => {});
      }

      await Customer.updateOne(
        { _id: customer._id },
        { $set: { expiryWarnedAt: new Date() } }
      );
      sent++;
    } catch (err) {
      console.error(`[notificationScheduler] ${customer._id}:`, err.message);
    }
  }

  if (sent > 0) {
    console.log(`[notificationScheduler] warned ${sent}/${expiring.length}`);
  }
};