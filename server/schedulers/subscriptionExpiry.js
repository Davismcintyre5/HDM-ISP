'use strict';

const Provider = require('../models/admin/Provider');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const notificationService = require('../services/notificationService');
const config = require('../config/env');

const NOTICE_DAYS = [10, 3, 1];
const MAX_PER_RUN = 200;

function daysBetween(from, to) {
  const ms =
    new Date(to).setUTCHours(0, 0, 0, 0) -
    new Date(from).setUTCHours(0, 0, 0, 0);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function alreadyNoticed(provider, days) {
  const sent = provider.subscriptionNoticesSent || [];
  return sent.includes(days);
}

async function markNoticed(providerId, days) {
  await Provider.updateOne(
    { _id: providerId },
    { $addToSet: { subscriptionNoticesSent: days } }
  );
}

async function sendNotice(provider, plan, days) {
  const periodEnd = provider.subscriptionEndsAt
    ? provider.subscriptionEndsAt.toISOString().slice(0, 10)
    : 'soon';
  const planName = plan?.name || 'your plan';
  const renewUrl = `${config.providerUrl}/billing`;

  if (provider.email) {
    await emailService
      .sendSubscriptionExpiring?.({
        to: provider.email,
        providerName: provider.name,
        planName,
        daysLeft: days,
        expiresAt: periodEnd,
        renewUrl,
      })
      .catch((err) =>
        console.error(`[subscriptionExpiry] email ${provider._id}:`, err.message)
      );
  }

  if (provider.phone) {
    await smsService
      .sendSubscriptionExpiring?.({
        to: provider.phone,
        planName,
        daysLeft: days,
        expiresAt: periodEnd,
      })
      .catch((err) =>
        console.error(`[subscriptionExpiry] sms ${provider._id}:`, err.message)
      );
  }

  if (provider.userId) {
    await notificationService
      .notifyProvider(provider.userId, {
        type: 'subscription_expiring',
        title: `Subscription expires in ${days} day${days === 1 ? '' : 's'}`,
        body: `Your ${planName} plan ends on ${periodEnd}. Renew to stay active.`,
        link: '/billing',
        meta: { daysLeft: days, planName, expiresAt: periodEnd },
      })
      .catch((err) =>
        console.error(`[subscriptionExpiry] inapp ${provider._id}:`, err.message)
      );
  }

  await markNoticed(provider._id, days);
}

async function expireProvider(provider) {
  await Provider.updateOne(
    { _id: provider._id },
    {
      $set: {
        status: 'suspended',
        billingStatus: 'overdue',
        subscriptionExpiredAt: new Date(),
      },
    }
  );

  if (provider.userId) {
    await notificationService
      .notifyProvider(provider.userId, {
        type: 'subscription_expired',
        title: 'Subscription expired',
        body: 'Your subscription has ended. Renew to restore access.',
        link: '/billing',
      })
      .catch(() => {});
  }

  if (provider.email) {
    await emailService
      .sendSuspended?.({
        to: provider.email,
        providerName: provider.name,
        reason: 'Subscription expired',
        suspendedAt: new Date(),
      })
      .catch(() => {});
  }
}

module.exports = async function subscriptionExpiry() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000);

  const providers = await Provider.find({
    status: 'active',
    billingStatus: 'active',
    subscriptionEndsAt: { $ne: null, $lte: horizon },
  })
    .populate('billingPlanId')
    .limit(MAX_PER_RUN);

  const eligible = providers.filter(
    (p) => p.billingPlanId && p.billingPlanId.billingCycle !== 'onetime'
  );

  if (!eligible.length) return;

  let notified = 0;
  let expired = 0;

  for (const provider of eligible) {
    const plan = provider.billingPlanId;
    const daysLeft = daysBetween(now, provider.subscriptionEndsAt);

    if (daysLeft < 0) {
      try {
        await expireProvider(provider);
        expired++;
      } catch (err) {
        console.error(`[subscriptionExpiry] expire ${provider._id}:`, err.message);
      }
      continue;
    }

    const matched = NOTICE_DAYS.find(
      (d) => daysLeft === d && !alreadyNoticed(provider, d)
    );

    if (matched) {
      try {
        await sendNotice(provider, plan, matched);
        notified++;
      } catch (err) {
        console.error(`[subscriptionExpiry] notice ${provider._id}:`, err.message);
      }
    }
  }

  if (notified > 0 || expired > 0) {
    console.log(
      `[subscriptionExpiry] notified=${notified} expired=${expired} scanned=${eligible.length}`
    );
  }
};