'use strict';

const {
  resolvePlatformBrand,
  resolveProviderBrand,
} = require('../utils/settings');

async function brandForPlatform() {
  return resolvePlatformBrand();
}

async function brandForProvider(providerId, providerDoc = null) {
  return resolveProviderBrand(providerId, providerDoc);
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function layout(brand, { title, preheader = '', body, cta }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
      <tr>
        <td style="background:${brand.color};padding:20px 28px;">
          ${brand.logoUrl
            ? `<img src="${brand.logoUrl}" alt="${escapeHtml(brand.name)}" style="height:32px;display:block;">`
            : `<span style="color:#ffffff;font-size:18px;font-weight:600;">${escapeHtml(brand.name)}</span>`}
        </td>
      </tr>
      <tr>
        <td style="padding:32px 28px 8px 28px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#0f172a;">${escapeHtml(title)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#334155;">${body}</div>
        </td>
      </tr>
      ${cta ? `
      <tr>
        <td style="padding:16px 28px 8px 28px;">
          <a href="${cta.url}" style="display:inline-block;background:${brand.accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">${escapeHtml(cta.label)}</a>
        </td>
      </tr>` : ''}
      <tr><td style="padding:24px 28px 0 28px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
      <tr>
        <td style="padding:20px 28px 28px 28px;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">Need help? Contact us:</p>
          ${brand.supportEmail ? `<p style="margin:0 0 4px 0;font-size:13px;color:#64748b;"><a href="mailto:${brand.supportEmail}" style="color:${brand.accent};text-decoration:none;">${brand.supportEmail}</a></p>` : ''}
          ${brand.supportPhone ? `<p style="margin:0 0 12px 0;font-size:13px;color:#64748b;"><a href="tel:${brand.supportPhone.replace(/\s+/g, '')}" style="color:${brand.accent};text-decoration:none;">${brand.supportPhone}</a></p>` : ''}
          <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} ${escapeHtml(brand.name)}${brand.website ? ` · <a href="${brand.website}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a>` : ''}</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function cta(url, label) {
  return { url, label };
}

function plain(lines) {
  return lines.filter(Boolean).join('\n');
}

function footer(brand) {
  return plain([
    '',
    '—',
    'Need help?',
    brand.supportEmail ? `Email: ${brand.supportEmail}` : '',
    brand.supportPhone ? `Phone: ${brand.supportPhone}` : '',
    brand.website || '',
  ]);
}

function money(amount, currency) {
  return `${currency} ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function humanDate(d) {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  });
}

// ─────────────────────────────────────────────
// 1. Verification
// ─────────────────────────────────────────────

const verification = ({ brand, name, verifyUrl, expiresIn = '24 hours' }) => ({
  subject: `Verify your ${brand.name} account`,
  html: layout(brand, {
    title: 'Verify your email',
    preheader: `Confirm your ${brand.name} account`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(name)},</p>
           <p style="margin:0 0 12px 0;">Click the button below to verify your email address.</p>
           <p style="margin:0;color:#64748b;font-size:13px;">This link expires in ${escapeHtml(expiresIn)}.</p>`,
    cta: cta(verifyUrl, 'Verify email'),
  }),
  text: plain([
    `Hi ${name},`,
    '',
    `Verify your ${brand.name} account:`,
    verifyUrl,
    '',
    `Link expires in ${expiresIn}.`,
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 2. Welcome
// ─────────────────────────────────────────────

const welcome = ({ brand, name, email, loginUrl }) => ({
  subject: `Welcome to ${brand.name}`,
  html: layout(brand, {
    title: `Welcome to ${brand.name}`,
    preheader: 'Your provider account is ready',
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(name)},</p>
           <p style="margin:0 0 12px 0;">Your email is verified and your provider account is ready.</p>
           ${email ? `
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">Login email</p>
               <p style="margin:0;font-size:14px;"><strong>${escapeHtml(email)}</strong></p>
             </td></tr>
           </table>` : ''}
           <p style="margin:0;">Log in to choose a subscription plan and get started.</p>`,
    cta: cta(loginUrl, 'Go to dashboard'),
  }),
  text: plain([
    `Hi ${name},`,
    '',
    'Your email is verified and your provider account is ready.',
    email ? `Login email: ${email}` : '',
    '',
    `Log in: ${loginUrl}`,
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 3. Admin alert — new provider
// ─────────────────────────────────────────────

const adminNewProvider = ({ brand, providerName, providerEmail, providerPhone, registeredAt, reviewUrl }) => ({
  subject: `New provider registration — ${providerName}`,
  html: layout(brand, {
    title: 'New provider registration',
    preheader: `${providerName} is awaiting review`,
    body: `<p style="margin:0 0 16px 0;">A new provider registered and is awaiting review.</p>
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Provider</p>
               <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;">${escapeHtml(providerName)}</p>
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Contact</p>
               <p style="margin:0 0 12px 0;font-size:14px;">${escapeHtml(providerEmail)}${providerPhone ? ` · ${escapeHtml(providerPhone)}` : ''}</p>
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Registered</p>
               <p style="margin:0;font-size:14px;">${escapeHtml(registeredAt)}</p>
             </td></tr>
           </table>`,
    cta: cta(reviewUrl, 'Review provider'),
  }),
  text: plain([
    `New provider registration: ${providerName}`,
    `Contact: ${providerEmail}${providerPhone ? `, ${providerPhone}` : ''}`,
    `Registered: ${registeredAt}`,
    '',
    `Review: ${reviewUrl}`,
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 4. Invoice (registration / upgrade / renewal)
// ─────────────────────────────────────────────

const invoice = ({
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
}) => {
  const label =
    purpose === 'renewal'
      ? 'Renewal invoice'
      : purpose === 'registration'
      ? 'Registration invoice'
      : 'Upgrade invoice';

  return {
    subject: `${label} ${invoiceNumber} — ${planName}`,
    html: layout(brand, {
      title: label,
      preheader: `${money(amount, currency)} due ${dueDate}`,
      body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
             <p style="margin:0 0 16px 0;">${escapeHtml(notes || `Your ${planName} invoice is ready.`)}</p>
             <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;">
               <tr><td style="padding:16px;">
                 <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Invoice</p>
                 <p style="margin:0 0 12px 0;font-size:14px;font-family:monospace;">${escapeHtml(invoiceNumber)}</p>
                 <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Plan</p>
                 <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;">${escapeHtml(planName)}</p>
                 <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Amount due</p>
                 <p style="margin:0 0 12px 0;font-size:20px;font-weight:700;">${escapeHtml(money(amount, currency))}</p>
                 <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Due date</p>
                 <p style="margin:0;font-size:14px;">${escapeHtml(dueDate)}</p>
               </td></tr>
             </table>`,
      cta: payUrl ? cta(payUrl, 'Pay invoice') : undefined,
    }),
    text: plain([
      `Hi ${providerName},`,
      '',
      `${label} ${invoiceNumber} for ${planName}.`,
      `Amount due: ${money(amount, currency)}`,
      `Due: ${dueDate}`,
      issuedAt ? `Issued: ${issuedAt}` : '',
      notes || '',
      payUrl ? `Pay: ${payUrl}` : '',
      footer(brand),
    ]),
  };
};

// ─────────────────────────────────────────────
// 5. Payment received (provider)
// ─────────────────────────────────────────────

const paymentReceived = ({ brand, providerName, invoiceNumber, amount, currency, receiptNumber, paidAt }) => ({
  subject: `Payment received — ${invoiceNumber}`,
  html: layout(brand, {
    title: 'Payment received',
    preheader: `We've confirmed your payment of ${money(amount, currency)}`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
           <p style="margin:0 0 16px 0;">We've confirmed your payment for invoice <strong>${escapeHtml(invoiceNumber)}</strong>. Thank you!</p>
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 4px 0;font-size:13px;color:#166534;">Amount</p>
               <p style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#14532d;">${escapeHtml(money(amount, currency))}</p>
               ${receiptNumber ? `<p style="margin:0 0 4px 0;font-size:13px;color:#166534;">Reference</p>
               <p style="margin:0 0 12px 0;font-size:14px;color:#14532d;font-family:monospace;">${escapeHtml(receiptNumber)}</p>` : ''}
               <p style="margin:0 0 4px 0;font-size:13px;color:#166534;">Date</p>
               <p style="margin:0;font-size:14px;color:#14532d;">${escapeHtml(humanDate(paidAt))}</p>
             </td></tr>
           </table>
           <p style="margin:16px 0 0 0;">Your plan will be updated shortly.</p>`,
  }),
  text: plain([
    `Hi ${providerName},`,
    '',
    `We've confirmed your payment for ${invoiceNumber}. Thank you!`,
    `Amount: ${money(amount, currency)}`,
    receiptNumber ? `Reference: ${receiptNumber}` : '',
    `Date: ${humanDate(paidAt)}`,
    '',
    'Your plan will be updated shortly.',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 6. Admin alert — payment received
// ─────────────────────────────────────────────

const adminPaymentReceived = ({ brand, providerName, providerEmail, invoiceNumber, planName, amount, currency, receiptNumber, paidAt, reviewUrl }) => ({
  subject: `Payment received — ${providerName} (${invoiceNumber})`,
  html: layout(brand, {
    title: 'Provider payment received',
    preheader: `${providerName} paid ${money(amount, currency)}`,
    body: `<p style="margin:0 0 16px 0;">A provider payment has been confirmed.</p>
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Provider</p>
               <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;">${escapeHtml(providerName)}</p>
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Contact</p>
               <p style="margin:0 0 12px 0;font-size:14px;">${escapeHtml(providerEmail)}</p>
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Invoice / Plan</p>
               <p style="margin:0 0 12px 0;font-size:14px;">${escapeHtml(invoiceNumber)} · ${escapeHtml(planName)}</p>
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Amount</p>
               <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;">${escapeHtml(money(amount, currency))}</p>
               ${receiptNumber ? `<p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Reference</p>
               <p style="margin:0 0 12px 0;font-size:14px;font-family:monospace;">${escapeHtml(receiptNumber)}</p>` : ''}
               <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">Paid</p>
               <p style="margin:0;font-size:14px;">${escapeHtml(humanDate(paidAt))}</p>
             </td></tr>
           </table>`,
    cta: reviewUrl ? cta(reviewUrl, 'View details') : undefined,
  }),
  text: plain([
    `Provider payment received: ${providerName}`,
    `Contact: ${providerEmail}`,
    `Invoice: ${invoiceNumber} · Plan: ${planName}`,
    `Amount: ${money(amount, currency)}`,
    receiptNumber ? `Reference: ${receiptNumber}` : '',
    `Paid: ${humanDate(paidAt)}`,
    '',
    reviewUrl ? `Details: ${reviewUrl}` : '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 7. Approved / activated
// ─────────────────────────────────────────────

const approved = ({ brand, providerName, planName, periodStart, periodEnd, dashboardUrl }) => ({
  subject: `Your ${brand.name} account is active`,
  html: layout(brand, {
    title: 'Plan activated',
    preheader: `${planName} is now active`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
           <p style="margin:0 0 16px 0;">Your subscription is now active.</p>
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 4px 0;font-size:13px;color:#166534;">Plan</p>
               <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#14532d;">${escapeHtml(planName)}</p>
               <p style="margin:0 0 4px 0;font-size:13px;color:#166534;">Active period</p>
               <p style="margin:0;font-size:14px;color:#14532d;">${escapeHtml(periodStart)} → ${escapeHtml(periodEnd)}</p>
             </td></tr>
           </table>
           <p style="margin:16px 0 0 0;">You can now set up routers, plans, and vouchers from your dashboard.</p>`,
    cta: dashboardUrl ? cta(dashboardUrl, 'Open dashboard') : undefined,
  }),
  text: plain([
    `Hi ${providerName},`,
    '',
    'Your subscription is now active.',
    `Plan: ${planName}`,
    `Period: ${periodStart} → ${periodEnd}`,
    '',
    dashboardUrl ? `Dashboard: ${dashboardUrl}` : '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 8. Password reset
// ─────────────────────────────────────────────

const passwordReset = ({ brand, fullName, resetUrl, expiresIn = '1 hour' }) => ({
  subject: `Reset your ${brand.name} password`,
  html: layout(brand, {
    title: 'Reset your password',
    preheader: 'Password reset requested',
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(fullName)},</p>
           <p style="margin:0 0 12px 0;">Click the button below to reset your password.</p>
           <p style="margin:0;color:#64748b;font-size:13px;">This link expires in ${escapeHtml(expiresIn)}. If you didn't request this, ignore this email.</p>`,
    cta: cta(resetUrl, 'Reset password'),
  }),
  text: plain([`Hi ${fullName},`, '', `Reset your password: ${resetUrl}`, '', `Expires in ${expiresIn}.`, footer(brand)]),
});

// ─────────────────────────────────────────────
// 9. Password changed
// ─────────────────────────────────────────────

const passwordChanged = ({ brand, fullName, when, ip }) => ({
  subject: 'Your password was changed',
  html: layout(brand, {
    title: 'Password changed',
    preheader: 'Your password was changed',
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(fullName)},</p>
           <p style="margin:0 0 12px 0;">Your ${escapeHtml(brand.name)} password was changed successfully.</p>
           <p style="margin:0;color:#64748b;font-size:13px;">When: ${escapeHtml(humanDate(when))}${ip ? ` · IP: ${escapeHtml(ip)}` : ''}</p>
           <p style="margin:12px 0 0 0;color:#64748b;font-size:13px;">If this wasn't you, contact support immediately.</p>`,
  }),
  text: plain([
    `Hi ${fullName},`,
    '',
    'Your password was changed.',
    `When: ${humanDate(when)}${ip ? ` · IP: ${ip}` : ''}`,
    'If this was not you, contact support immediately.',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 10. Rejection
// ─────────────────────────────────────────────

const rejection = ({ brand, name, businessName, reason }) => ({
  subject: `Your ${brand.name} registration was not approved`,
  html: layout(brand, {
    title: 'Registration not approved',
    preheader: 'Your registration status',
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(name)},</p>
           <p style="margin:0 0 12px 0;">Registration for <strong>${escapeHtml(businessName)}</strong> was not approved.</p>
           ${reason ? `<p style="margin:0 0 12px 0;color:#64748b;font-size:13px;">Reason: ${escapeHtml(reason)}</p>` : ''}
           <p style="margin:0;">If you believe this is a mistake, contact support.</p>`,
  }),
  text: plain([
    `Hi ${name},`,
    '',
    `Registration for ${businessName} was not approved.`,
    reason ? `Reason: ${reason}` : '',
    'If you believe this is a mistake, contact support.',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 11. Pending reminder
// ─────────────────────────────────────────────

const pendingReminder = ({ brand, name, businessName, daysLeft, actionUrl }) => ({
  subject: `Your ${brand.name} registration expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
  html: layout(brand, {
    title: 'Registration expiring soon',
    preheader: `${businessName} will expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(name)},</p>
           <p style="margin:0 0 12px 0;">Your registration for <strong>${escapeHtml(businessName)}</strong> expires in <strong>${escapeHtml(String(daysLeft))}</strong> day${daysLeft === 1 ? '' : 's'}.</p>
           <p style="margin:0;">Complete the remaining steps to keep your account active.</p>`,
    cta: actionUrl ? cta(actionUrl, 'Continue setup') : undefined,
  }),
  text: plain([
    `Hi ${name},`,
    '',
    `Your registration for ${businessName} expires in ${daysLeft} day(s).`,
    'Complete the remaining steps to keep your account active.',
    actionUrl || '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 12. Pending expired
// ─────────────────────────────────────────────

const pendingExpired = ({ brand, name, businessName }) => ({
  subject: `Your ${brand.name} registration expired`,
  html: layout(brand, {
    title: 'Registration expired',
    preheader: `${businessName} was not completed in time`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(name)},</p>
           <p style="margin:0 0 12px 0;">The registration for <strong>${escapeHtml(businessName)}</strong> has expired because it was not completed in time.</p>
           <p style="margin:0;">You can register again at any time, or contact support for help.</p>`,
  }),
  text: plain([
    `Hi ${name},`,
    '',
    `Registration for ${businessName} expired.`,
    'You can register again at any time, or contact support for help.',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 13. Staff welcome
// ─────────────────────────────────────────────

const staffWelcome = ({ brand, fullName, businessName, email, temporaryPassword, role, loginUrl }) => ({
  subject: `You've been added to ${businessName || brand.name}`,
  html: layout(brand, {
    title: `Welcome to ${businessName || brand.name}`,
    preheader: `Your ${role || 'provider'} account is ready`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(fullName)},</p>
           <p style="margin:0 0 12px 0;">An account has been created for you on ${escapeHtml(brand.name)}${businessName ? ` for <strong>${escapeHtml(businessName)}</strong>` : ''}.</p>
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">Login credentials</p>
               <p style="margin:0 0 4px 0;font-size:14px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p style="margin:0;font-size:14px;"><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword || '(use the password you were given)')}</p>
             </td></tr>
           </table>
           <p style="margin:0;">You'll be asked to change your password on first login.</p>`,
    cta: cta(loginUrl, 'Log in'),
  }),
  text: plain([
    `Hi ${fullName},`,
    '',
    `An account has been created for you${businessName ? ` for ${businessName}` : ''}.`,
    `Email: ${email}`,
    temporaryPassword ? `Temporary password: ${temporaryPassword}` : '',
    '',
    `Log in: ${loginUrl}`,
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 14. Subscription expiring (reminder)
// ─────────────────────────────────────────────

const subscriptionExpiring = ({ brand, providerName, planName, daysLeft, expiresAt, renewUrl }) => ({
  subject: `Subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
  html: layout(brand, {
    title: 'Subscription expiring soon',
    preheader: `${planName} ends ${expiresAt}`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
           <p style="margin:0 0 16px 0;">Your <strong>${escapeHtml(planName)}</strong> subscription expires in <strong>${escapeHtml(String(daysLeft))}</strong> day${daysLeft === 1 ? '' : 's'} (${escapeHtml(expiresAt)}).</p>
           <p style="margin:0;">Renew now to avoid interruption.</p>`,
    cta: renewUrl ? cta(renewUrl, 'Renew subscription') : undefined,
  }),
  text: plain([
    `Hi ${providerName},`,
    '',
    `Your ${planName} subscription expires in ${daysLeft} day(s) on ${expiresAt}.`,
    'Renew to stay active.',
    renewUrl || '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 15. Subscription overdue
// ─────────────────────────────────────────────

const subscriptionOverdue = ({ brand, providerName, planName, amount, currency, daysOverdue, payUrl }) => ({
  subject: `Subscription overdue — ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`,
  html: layout(brand, {
    title: 'Subscription overdue',
    preheader: `Your ${planName} payment is overdue`,
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
           <p style="margin:0 0 16px 0;">Your <strong>${escapeHtml(planName)}</strong> subscription payment is now <strong>${escapeHtml(String(daysOverdue))}</strong> day${daysOverdue === 1 ? '' : 's'} overdue.</p>
           <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
             <tr><td style="padding:16px;">
               <p style="margin:0 0 4px 0;font-size:13px;color:#991b1b;">Amount due</p>
               <p style="margin:0;font-size:18px;font-weight:600;color:#7f1d1d;">${escapeHtml(money(amount, currency))}</p>
             </td></tr>
           </table>
           <p style="margin:16px 0 0 0;">Please pay as soon as possible to avoid service interruption.</p>`,
    cta: payUrl ? cta(payUrl, 'Pay now') : undefined,
  }),
  text: plain([
    `Hi ${providerName},`,
    '',
    `Your ${planName} subscription is ${daysOverdue} day(s) overdue.`,
    `Amount due: ${money(amount, currency)}`,
    payUrl ? `Pay: ${payUrl}` : '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 16. Suspended
// ─────────────────────────────────────────────

const suspended = ({ brand, providerName, reason, suspendedAt }) => ({
  subject: `Your ${brand.name} account has been suspended`,
  html: layout(brand, {
    title: 'Account suspended',
    preheader: 'Your provider account has been suspended',
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
           <p style="margin:0 0 12px 0;">Your account has been suspended and dashboard access is blocked.</p>
           ${reason ? `<p style="margin:0 0 12px 0;color:#64748b;font-size:13px;">Reason: ${escapeHtml(reason)}</p>` : ''}
           <p style="margin:0;color:#64748b;font-size:13px;">Suspended on: ${escapeHtml(humanDate(suspendedAt))}</p>
           <p style="margin:16px 0 0 0;">Contact support if you believe this is a mistake.</p>`,
  }),
  text: plain([
    `Hi ${providerName},`,
    '',
    'Your account has been suspended and dashboard access is blocked.',
    reason ? `Reason: ${reason}` : '',
    `Suspended on: ${humanDate(suspendedAt)}`,
    'Contact support if you believe this is a mistake.',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 17. Reactivated
// ─────────────────────────────────────────────

const reactivated = ({ brand, providerName, planName, dashboardUrl }) => ({
  subject: `Your ${brand.name} account is active again`,
  html: layout(brand, {
    title: 'Account reactivated',
    preheader: 'Dashboard access has been restored',
    body: `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(providerName)},</p>
           <p style="margin:0 0 12px 0;">Your account has been reactivated. Dashboard access is restored.</p>
           ${planName ? `<p style="margin:0 0 12px 0;color:#64748b;font-size:13px;">Current plan: <strong>${escapeHtml(planName)}</strong></p>` : ''}
           <p style="margin:0;">You can log back in and continue where you left off.</p>`,
    cta: dashboardUrl ? cta(dashboardUrl, 'Open dashboard') : undefined,
  }),
  text: plain([
    `Hi ${providerName},`,
    '',
    'Your account has been reactivated. Dashboard access is restored.',
    planName ? `Plan: ${planName}` : '',
    '',
    dashboardUrl ? `Dashboard: ${dashboardUrl}` : '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// 18. Voucher purchase (end user)
// ─────────────────────────────────────────────

const voucherPurchase = ({ brand, voucherCode, planName, expiresAt, portalUrl }) => ({
  subject: `${brand.name}: your WiFi voucher`,
  html: layout(brand, {
    title: 'Your WiFi voucher is ready',
    preheader: `Voucher ${voucherCode} for ${planName}`,
    body: `<p style="margin:0 0 16px 0;">Thank you for your payment.</p>
           <div style="font-size:24px;font-weight:bold;letter-spacing:4px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;font-family:monospace;">
             ${escapeHtml(voucherCode)}
           </div>
           <ul style="margin:16px 0 0 0;padding-left:20px;font-size:14px;color:#334155;">
             <li><strong>Plan:</strong> ${escapeHtml(planName)}</li>
             ${expiresAt ? `<li><strong>Valid until:</strong> ${escapeHtml(expiresAt)}</li>` : ''}
           </ul>
           <p style="margin:16px 0 0 0;">Connect to the WiFi network and enter the code on the login page.</p>
           ${portalUrl ? `<p><a href="${portalUrl}" style="display:inline-block;background:${brand.accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Open login page</a></p>` : ''}`,
  }),
  text: plain([
    'Your WiFi voucher',
    '',
    `Code: ${voucherCode}`,
    `Plan: ${planName}`,
    expiresAt ? `Valid until: ${expiresAt}` : '',
    '',
    'Connect to the WiFi and enter the code on the login page.',
    portalUrl || '',
    footer(brand),
  ]),
});

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

module.exports = {
  brandForPlatform,
  brandForProvider,
  escapeHtml,
  layout,
  cta,
  plain,
  footer,
  money,
  humanDate,
  verification,
  welcome,
  adminNewProvider,
  invoice,
  paymentReceived,
  adminPaymentReceived,
  approved,
  passwordReset,
  passwordChanged,
  rejection,
  pendingReminder,
  pendingExpired,
  staffWelcome,
  subscriptionExpiring,
  subscriptionOverdue,
  suspended,
  reactivated,
  voucherPurchase,
};