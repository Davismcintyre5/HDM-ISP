'use strict';

const axios = require('axios');
const config = require('../config/env');
const hdm = require('../config/hdmBridge');
const templates = require('../templates/emailTemplates');
const { getProviderSettings } = require('../utils/settings');
const NotificationLog = require('../models/admin/NotificationLog');
const ApiError = require('../utils/apiError');

async function postEmail({ to, subject, htmlBody, textBody, from, fromName }) {
  if (!config.hdm.emailEnabled) {
    return { skipped: true, reason: 'email_disabled_globally' };
  }
  if (!to || !subject || !htmlBody) {
    throw ApiError.badRequest('Email requires `to`, `subject`, `htmlBody`');
  }

  const payload = {
    from: from || hdm.fromEmail,
    fromName: fromName || hdm.fromName,
    to,
    subject,
    htmlBody,
    textBody: textBody || undefined,
  };

  const url = `${hdm.baseUrl}${hdm.endpoints.emailSend}`;
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
    errData?.error || lastError?.message || 'Email send failed',
    { code: errData?.code || null }
  );
}

async function logResult({ providerId = null, to, result, template, error = null }) {
  try {
    await NotificationLog.create({
      providerId,
      channel: 'email',
      to,
      messageId: result?.messageId || null,
      status: error
        ? 'failed'
        : result?.skipped
        ? 'queued'
        : result?.success
        ? 'sent'
        : 'failed',
      error: error ? String(error).slice(0, 500) : null,
      template,
    });
  } catch (logErr) {
    console.error('[emailService] log failed:', logErr.message);
  }
}

async function providerAllowsEmail(providerId) {
  if (!providerId) return true;
  const settings = await getProviderSettings(providerId);
  return settings['notifications.emailEnabled'] !== false;
}

async function resolveSender(providerId) {
  if (!providerId) return { from: hdm.fromEmail, fromName: hdm.fromName };
  const settings = await getProviderSettings(providerId);
  const nameOverride = settings['notifications.senderName'];
  return {
    from: hdm.fromEmail,
    fromName: nameOverride || hdm.fromName,
  };
}

async function safeSend({ to, subject, htmlBody, textBody, from, fromName, providerId, template }) {
  let result = null;
  let error = null;
  try {
    result = await postEmail({ to, subject, htmlBody, textBody, from, fromName });
  } catch (err) {
    error = err.message;
  }
  await logResult({ providerId, to, result, template, error });
  if (error) return { success: false, error, template };
  return { ...result, template };
}

async function sendVerification({ to, name, verifyUrl, expiresIn }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.verification({ brand, name, verifyUrl, expiresIn });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'verification',
  });
}

async function sendWelcome({ to, name, email, loginUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.welcome({ brand, name, email, loginUrl });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'welcome',
  });
}

async function sendAdminNewProvider({ to, providerName, providerEmail, providerPhone, registeredAt, reviewUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.adminNewProvider({
    brand,
    providerName,
    providerEmail,
    providerPhone,
    registeredAt,
    reviewUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'adminNewProvider',
  });
}

async function sendInvoice({
  to,
  providerName,
  invoiceNumber,
  planName,
  amount,
  currency,
  dueDate,
  issuedAt,
  notes,
  purpose,
  payUrl,
}) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.invoice({
    brand,
    providerName,
    invoiceNumber,
    planName,
    amount,
    currency,
    dueDate,
    issuedAt,
    notes,
    purpose,
    payUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'invoice',
  });
}

async function sendPaymentReceived({ to, providerName, invoiceNumber, amount, currency, receiptNumber, paidAt }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.paymentReceived({
    brand,
    providerName,
    invoiceNumber,
    amount,
    currency,
    receiptNumber,
    paidAt,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'paymentReceived',
  });
}

async function sendAdminPaymentReceived({
  to,
  providerName,
  providerEmail,
  invoiceNumber,
  planName,
  amount,
  currency,
  receiptNumber,
  paidAt,
  reviewUrl,
}) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.adminPaymentReceived({
    brand,
    providerName,
    providerEmail,
    invoiceNumber,
    planName,
    amount,
    currency,
    receiptNumber,
    paidAt,
    reviewUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'adminPaymentReceived',
  });
}

async function sendApproved({ to, providerName, planName, periodStart, periodEnd, dashboardUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.approved({
    brand,
    providerName,
    planName,
    periodStart,
    periodEnd,
    dashboardUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'approved',
  });
}

async function sendPasswordReset({ to, fullName, resetUrl, expiresIn }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.passwordReset({ brand, fullName, resetUrl, expiresIn });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'passwordReset',
  });
}

async function sendPasswordChanged({ to, fullName, when, ip }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.passwordChanged({ brand, fullName, when, ip });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'passwordChanged',
  });
}

async function sendRejection({ to, name, businessName, reason }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.rejection({ brand, name, businessName, reason });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'rejection',
  });
}

async function sendPendingReminder({ to, name, businessName, daysLeft, actionUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.pendingReminder({ brand, name, businessName, daysLeft, actionUrl });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'pendingReminder',
  });
}

async function sendPendingExpired({ to, name, businessName }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.pendingExpired({ brand, name, businessName });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'pendingExpired',
  });
}

async function sendStaffWelcome({ to, fullName, businessName, email, temporaryPassword, role, loginUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.staffWelcome({
    brand,
    fullName,
    businessName,
    email,
    temporaryPassword,
    role,
    loginUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'staffWelcome',
  });
}

async function sendSubscriptionExpiring({ to, providerName, planName, daysLeft, expiresAt, renewUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.subscriptionExpiring({
    brand,
    providerName,
    planName,
    daysLeft,
    expiresAt,
    renewUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'subscriptionExpiring',
  });
}

async function sendSubscriptionOverdue({ to, providerName, planName, amount, currency, daysOverdue, payUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.subscriptionOverdue({
    brand,
    providerName,
    planName,
    amount,
    currency,
    daysOverdue,
    payUrl,
  });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'subscriptionOverdue',
  });
}

async function sendSuspended({ to, providerName, reason, suspendedAt }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.suspended({ brand, providerName, reason, suspendedAt });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'suspended',
  });
}

async function sendReactivated({ to, providerName, planName, dashboardUrl }) {
  const brand = await templates.brandForPlatform();
  const tpl = templates.reactivated({ brand, providerName, planName, dashboardUrl });
  const sender = await resolveSender(null);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    ...sender,
    providerId: null,
    template: 'reactivated',
  });
}

async function sendVoucherPurchase({
  to,
  voucherCode,
  planName,
  expiresAt,
  portalUrl,
  providerId,
  providerDoc = null,
}) {
  if (!providerId) throw ApiError.badRequest('providerId required for customer email');
  if (!(await providerAllowsEmail(providerId))) {
    return { skipped: true, reason: 'provider_disabled_email' };
  }
  const brand = await templates.brandForProvider(providerId, providerDoc);
  const tpl = templates.voucherPurchase({
    brand,
    voucherCode,
    planName,
    expiresAt,
    portalUrl: portalUrl || brand.portalUrl,
  });
  const sender = await resolveSender(providerId);
  return safeSend({
    to,
    subject: tpl.subject,
    htmlBody: tpl.html,
    textBody: tpl.text,
    from: sender.from,
    fromName: sender.fromName,
    providerId,
    template: 'voucherPurchase',
  });
}

async function sendRaw({ to, subject, html, text, providerId = null, template = 'raw' }) {
  if (!to || !subject || !html) {
    throw ApiError.badRequest('sendRaw requires `to`, `subject`, `html`');
  }
  const sender = await resolveSender(providerId);
  return safeSend({
    to,
    subject,
    htmlBody: html,
    textBody: text,
    from: sender.from,
    fromName: sender.fromName,
    providerId,
    template,
  });
}

module.exports = {
  sendVerification,
  sendWelcome,
  sendAdminNewProvider,
  sendInvoice,
  sendPaymentReceived,
  sendAdminPaymentReceived,
  sendApproved,
  sendPasswordReset,
  sendPasswordChanged,
  sendRejection,
  sendPendingReminder,
  sendPendingExpired,
  sendStaffWelcome,
  sendSubscriptionExpiring,
  sendSubscriptionOverdue,
  sendSuspended,
  sendReactivated,
  sendVoucherPurchase,
  sendRaw,
};