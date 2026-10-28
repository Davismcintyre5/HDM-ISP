'use strict';

const emailService = require('./emailService');
const smsService = require('./smsService');
const notificationService = require('./notificationService');
const config = require('../config/env');

function computeSubscriptionEnd(billingPlan, from = new Date()) {
  if (!billingPlan) return null;
  if (billingPlan.billingCycle === 'trial') {
    return new Date(from.getTime() + (billingPlan.trialDays || 14) * 24 * 60 * 60 * 1000);
  }
  if (billingPlan.billingCycle === 'monthly') {
    const base = from instanceof Date ? from : new Date();
    const end = new Date(base);
    end.setMonth(end.getMonth() + 1);
    return end;
  }
  return null;
}

async function activateProviderPlan(provider, billingPlan, { sendEmails = true } = {}) {
  if (!provider || !billingPlan) {
    throw new Error('provider and billingPlan required');
  }

  const now = new Date();

  let base = now;
  if (
    billingPlan.billingCycle === 'monthly' &&
    provider.subscriptionEndsAt &&
    provider.subscriptionEndsAt > now
  ) {
    base = provider.subscriptionEndsAt;
  }

  const newEnd = computeSubscriptionEnd(billingPlan, base);

  provider.billingPlanId = billingPlan._id;
  provider.billingStatus = 'active';
  provider.status = 'active';
  provider.subscriptionEndsAt = newEnd;
  provider.subscriptionExpiredAt = null;
  provider.subscriptionNoticesSent = [];
  await provider.save();

  if (sendEmails) {
    try {
      emailService
        .sendApproved({
          to: provider.email,
          providerName: provider.name,
          planName: billingPlan.name,
          periodStart: now.toISOString().slice(0, 10),
          periodEnd: newEnd ? newEnd.toISOString().slice(0, 10) : 'never',
          dashboardUrl: `${config.providerUrl}/dashboard`,
        })
        .catch((err) =>
          console.error('[subscriptionService] approved email failed:', err.message)
        );

      if (provider.phone) {
        smsService
          .sendApproved({ to: provider.phone, planName: billingPlan.name })
          .catch((err) =>
            console.error('[subscriptionService] approved sms failed:', err.message)
          );
      }

      if (provider.userId) {
        notificationService
          .notifyProvider(provider.userId, {
            type: 'subscription_updated',
            title: 'Subscription updated',
            body: `Your ${billingPlan.name} plan is now active.`,
            link: '/billing',
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('[subscriptionService] dispatch failed:', err.message);
    }
  }

  return { newEnd, now };
}

module.exports = { activateProviderPlan, computeSubscriptionEnd };