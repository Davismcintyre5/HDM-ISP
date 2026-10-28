'use strict';

const axios = require('axios');
const config = require('../config/env');
const hdm = require('../config/hdmBridge');
const smsTemplates = require('../templates/smsTemplates');
const {
  brandForPlatform,
  brandForProvider,
} = require('../templates/emailTemplates');
const { getProviderSettings } = require('../utils/settings');
const NotificationLog = require('../models/admin/NotificationLog');
const ApiError = require('../utils/apiError');

async function postSms({ to, content, sender, type = 'transactional' }) {
  if (!config.hdm.smsEnabled) {
    return { skipped: true, reason: 'sms_disabled_globally' };
  }
  if (!to || !content) {
    throw ApiError.badRequest('SMS requires `to` and `content`');
  }

  const payload = {
    to: String(to).replace(/\D/g, ''),
    content,
    type,
  };
  if (sender) payload.sender = sender;

  const url = `${hdm.baseUrl}${hdm.endpoints.smsSend}`;
  const headers = {
    Authorization: `Bearer ${hdm.apiKey}`,
    'Content-Type': 'application/json',
  };

  const attempts = Math.max(1, hdm.retryCount + 1);
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      const { data } = await axios.post(url, payload, {
        headers,
        timeout: hdm.timeout,
      });
      return {
        skipped: false,
        success: data?.success === true,
        messageId: data?.messageId,
        status: data?.status,
        creditsUsed: data?.creditsUsed || 0,
        raw: data,
      };
    } catch (err) {
      lastError = err;
      const code = err.response?.data?.code;
      if (
        code === 'VALIDATION_001' ||
        code === 'AUTH_001' ||
        code === 'LIMIT_001' ||
        code === 'PAYMENT_REQUIRED'
      ) {
        break;
      }
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
  }

  const errData = lastError?.response?.data;
  throw ApiError.badGateway(
    errData?.error || lastError?.message || 'SMS send failed',
    { code: errData?.code || null }
  );
}

async function logResult({ providerId = null, to, result, template, error = null }) {
  try {
    await NotificationLog.create({
      providerId,
      channel: 'sms',
      to,
      messageId: result?.messageId || null,
      status: error
        ? 'failed'
        : result?.skipped
        ? 'queued'
        : result?.success
        ? 'sent'
        : 'failed',
      creditsUsed: result?.creditsUsed || 0,
      error: error ? String(error).slice(0, 500) : null,
      template,
    });
  } catch (logErr) {
    console.error('[smsService] log failed:', logErr.message);
  }
}

async function providerAllowsSms(providerId) {
  if (!providerId) return true;
  const settings = await getProviderSettings(providerId);
  return settings['notifications.smsEnabled'] !== false;
}

async function resolveSender(providerId) {
  if (!providerId) return hdm.smsSender;
  const settings = await getProviderSettings(providerId);
  const override = settings['notifications.senderName'];
  return override && override.length <= 11 ? override : hdm.smsSender;
}

async function safeSend({ to, content, providerId, template }) {
  const sender = await resolveSender(providerId);
  let result = null;
  let error = null;

  try {
    result = await postSms({ to, content, sender });
  } catch (err) {
    error = err.message;
  }

  await logResult({ providerId, to, result, template, error });

  if (error) {
    return { success: false, error, template };
  }
  return { ...result, template };
}

async function sendVerificationCode({ to, code, expiresIn }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.verificationCode({ brand, code, expiresIn });
  return safeSend({ to, content, providerId: null, template: 'verificationCode' });
}

async function sendInvoiceDue({ to, invoiceNumber, amount, currency, dueDate }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.invoiceDue({ brand, invoiceNumber, amount, currency, dueDate });
  return safeSend({ to, content, providerId: null, template: 'invoiceDue' });
}

async function sendPaymentReceived({ to, invoiceNumber, amount, currency }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.paymentReceived({ brand, invoiceNumber, amount, currency });
  return safeSend({ to, content, providerId: null, template: 'paymentReceived' });
}

async function sendSubscriptionExpiring({ to, planName, daysLeft, expiresAt }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.subscriptionExpiring({ brand, planName, daysLeft, expiresAt });
  return safeSend({ to, content, providerId: null, template: 'subscriptionExpiring' });
}

async function sendSubscriptionOverdue({ to, planName, daysOverdue }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.subscriptionOverdue({ brand, planName, daysOverdue });
  return safeSend({ to, content, providerId: null, template: 'subscriptionOverdue' });
}

async function sendApproved({ to, planName }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.approved({ brand, planName });
  return safeSend({ to, content, providerId: null, template: 'approved' });
}

async function sendSuspended({ to, reason }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.suspended({ brand, reason });
  return safeSend({ to, content, providerId: null, template: 'suspended' });
}

async function sendReactivated({ to }) {
  const brand = await brandForPlatform();
  const content = smsTemplates.reactivated({ brand });
  return safeSend({ to, content, providerId: null, template: 'reactivated' });
}

async function sendVoucherReady({ to, voucherCode, planName, providerId, providerDoc = null }) {
  if (!(await providerAllowsSms(providerId))) {
    return { skipped: true, reason: 'provider_disabled_sms' };
  }
  const brand = await brandForProvider(providerId, providerDoc);
  const content = smsTemplates.voucherReady({ brand, voucherCode, planName });
  return safeSend({ to, content, providerId, template: 'voucherReady' });
}

async function sendVoucherRedeemed({ to, planName, expiresAt, providerId, providerDoc = null }) {
  if (!(await providerAllowsSms(providerId))) {
    return { skipped: true, reason: 'provider_disabled_sms' };
  }
  const brand = await brandForProvider(providerId, providerDoc);
  const content = smsTemplates.voucherRedeemed({ brand, planName, expiresAt });
  return safeSend({ to, content, providerId, template: 'voucherRedeemed' });
}

async function sendPaymentFailed({ to, reason, providerId, providerDoc = null }) {
  if (!(await providerAllowsSms(providerId))) {
    return { skipped: true, reason: 'provider_disabled_sms' };
  }
  const brand = await brandForProvider(providerId, providerDoc);
  const content = smsTemplates.paymentFailed({ brand, reason });
  return safeSend({ to, content, providerId, template: 'paymentFailed' });
}

async function sendExpiryWarning({ to, planName, expiresAt, providerId, providerDoc = null }) {
  if (!(await providerAllowsSms(providerId))) {
    return { skipped: true, reason: 'provider_disabled_sms' };
  }
  const brand = await brandForProvider(providerId, providerDoc);
  const content = smsTemplates.expiryWarning({ brand, planName, expiresAt });
  return safeSend({ to, content, providerId, template: 'expiryWarning' });
}

async function sendPlanExpired({ to, planName, providerId, providerDoc = null }) {
  if (!(await providerAllowsSms(providerId))) {
    return { skipped: true, reason: 'provider_disabled_sms' };
  }
  const brand = await brandForProvider(providerId, providerDoc);
  const content = smsTemplates.planExpired({ brand, planName });
  return safeSend({ to, content, providerId, template: 'planExpired' });
}

module.exports = {
  sendVerificationCode,
  sendInvoiceDue,
  sendPaymentReceived,
  sendSubscriptionExpiring,
  sendSubscriptionOverdue,
  sendApproved,
  sendSuspended,
  sendReactivated,
  sendVoucherReady,
  sendVoucherRedeemed,
  sendPaymentFailed,
  sendExpiryWarning,
  sendPlanExpired,
};