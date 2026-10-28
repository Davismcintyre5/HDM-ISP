'use strict';

const SMS_MAX = 160;

function truncate(text) {
  if (!text) return '';
  const t = String(text).trim();
  if (t.length <= SMS_MAX) return t;
  return t.slice(0, SMS_MAX - 1) + '…';
}

const verificationCode = ({ brand, code, expiresIn = '10 minutes' }) =>
  truncate(
    `${brand.name}: Your verification code is ${code}. Expires in ${expiresIn}. Do not share this code.`
  );

const invoiceDue = ({ brand, invoiceNumber, amount, currency, dueDate }) =>
  truncate(
    `${brand.name}: Invoice ${invoiceNumber} for ${currency} ${amount} is due ${dueDate}. Log in to pay.`
  );

const paymentReceived = ({ brand, invoiceNumber, amount, currency }) =>
  truncate(
    `${brand.name}: Payment of ${currency} ${amount} received for invoice ${invoiceNumber}. Thank you.`
  );

const subscriptionExpiring = ({ brand, planName, daysLeft, expiresAt }) =>
  truncate(
    `${brand.name}: Your ${planName} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} on ${expiresAt}. Renew to stay active.`
  );

const subscriptionOverdue = ({ brand, planName, daysOverdue }) =>
  truncate(
    `${brand.name}: Your ${planName} subscription is ${daysOverdue} day(s) overdue. Pay now to avoid service interruption.`
  );

const approved = ({ brand, planName }) =>
  truncate(
    `${brand.name}: Your ${planName} plan is now active. Log in to your dashboard to continue.`
  );

const suspended = ({ brand, reason }) =>
  truncate(
    `${brand.name}: Your account has been suspended.${reason ? ` Reason: ${reason}.` : ''} Contact support.`
  );

const reactivated = ({ brand }) =>
  truncate(`${brand.name}: Your account has been reactivated. Dashboard access is restored.`);

const voucherReady = ({ brand, voucherCode, planName }) =>
  truncate(
    `${brand.name}: Your voucher ${voucherCode} for ${planName} is ready. Connect to WiFi and enter it on the login page.`
  );

const voucherRedeemed = ({ brand, planName, expiresAt }) =>
  truncate(
    `${brand.name}: Your ${planName} plan is active${expiresAt ? ` until ${expiresAt}` : ''}. Enjoy your connection.`
  );

const paymentFailed = ({ brand, reason }) =>
  truncate(
    `${brand.name}: Payment failed.${reason ? ` ${reason}.` : ''} Please try again from the portal.`
  );

const expiryWarning = ({ brand, planName, expiresAt }) =>
  truncate(
    `${brand.name}: Your ${planName} plan expires on ${expiresAt}. Renew to stay connected.`
  );

const planExpired = ({ brand, planName }) =>
  truncate(
    `${brand.name}: Your ${planName} plan has expired. Renew from the portal to reconnect.`
  );

module.exports = {
  SMS_MAX,
  truncate,
  verificationCode,
  invoiceDue,
  paymentReceived,
  subscriptionExpiring,
  subscriptionOverdue,
  approved,
  suspended,
  reactivated,
  voucherReady,
  voucherRedeemed,
  paymentFailed,
  expiryWarning,
  planExpired,
};