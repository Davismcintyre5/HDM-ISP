import { sanitizePhone } from './format';

function fail(errors) {
  return { ok: false, errors };
}

function pass() {
  return { ok: true, errors: {} };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const URL_RE = /^https?:\/\/.+/i;

export function validatePlan(form) {
  const e = {};
  if (!form.name || !form.name.trim()) e.name = 'Name is required';
  else if (form.name.length > 80) e.name = 'Name is too long';
  if (!form.type) e.type = 'Type is required';
  if (form.price === '' || form.price === null || form.price === undefined)
    e.price = 'Price is required';
  else if (Number(form.price) < 0) e.price = 'Price cannot be negative';
  if (!['minutes', 'hours', 'days', 'months'].includes(form.validityUnit))
    e.validityUnit = 'Invalid unit';
  if (!form.validityValue || Number(form.validityValue) < 1)
    e.validityValue = 'Must be at least 1';
  if (form.rateLimitDownKbps !== '' && Number(form.rateLimitDownKbps) < 0)
    e.rateLimitDownKbps = 'Cannot be negative';
  if (form.rateLimitUpKbps !== '' && Number(form.rateLimitUpKbps) < 0)
    e.rateLimitUpKbps = 'Cannot be negative';
  if (form.dataCapMb !== '' && Number(form.dataCapMb) < 0)
    e.dataCapMb = 'Cannot be negative';
  return Object.keys(e).length ? fail(e) : pass();
}

export function validateRouter(form, { isEdit = false } = {}) {
  const e = {};
  if (!form.name || !form.name.trim()) e.name = 'Name is required';
  if (!form.ipAddress || !form.ipAddress.trim()) e.ipAddress = 'IP address is required';
  if (!form.apiUsername || !form.apiUsername.trim())
    e.apiUsername = 'API username is required';
  const port = Number(form.apiPort);
  if (!port || port < 1 || port > 65535) e.apiPort = 'Port must be 1–65535';
  if (!isEdit) {
    if (!form.apiPassword) e.apiPassword = 'Password is required';
    if (!form.radiusSecret) e.radiusSecret = 'RADIUS secret is required';
  }
  return Object.keys(e).length ? fail(e) : pass();
}

export function validateCustomer(form) {
  const e = {};
  if (!form.username || !form.username.trim()) e.username = 'Username is required';
  else if (!USERNAME_RE.test(form.username)) e.username = 'Letters, numbers, _ . - only';
  if (form.phone && !sanitizePhone(form.phone))
    e.phone = 'Enter a valid Kenyan phone number';
  if (form.email && !EMAIL_RE.test(form.email)) e.email = 'Invalid email';
  if (form.macAddress && !MAC_RE.test(form.macAddress))
    e.macAddress = 'Format: aa:bb:cc:dd:ee:ff';
  return Object.keys(e).length ? fail(e) : pass();
}

export function validateVoucherGenerate(form) {
  const e = {};
  if (!form.planId) e.planId = 'Plan is required';
  const c = Number(form.count);
  if (!c || c < 1 || c > 1000) e.count = 'Must be between 1 and 1000';
  if (form.expiresAt) {
    const d = new Date(form.expiresAt);
    if (isNaN(d)) e.expiresAt = 'Invalid date';
    else if (d.getTime() < Date.now()) e.expiresAt = 'Must be in the future';
  }
  return Object.keys(e).length ? fail(e) : pass();
}

export function validateRenewal(form) {
  const e = {};
  if (!form.customerId) e.customerId = 'Customer is required';
  return Object.keys(e).length ? fail(e) : pass();
}

export function validateSettings(form) {
  const e = {};
  if (form['branding.logoUrl'] && !URL_RE.test(form['branding.logoUrl']))
    e['branding.logoUrl'] = 'Must be a URL';
  if (form['branding.primaryColor'] && !HEX_RE.test(form['branding.primaryColor']))
    e['branding.primaryColor'] = 'Format: #RRGGBB';
  if (form['support.phone'] && !sanitizePhone(form['support.phone']))
    e['support.phone'] = 'Enter a valid Kenyan phone number';
  if (form['support.email'] && !EMAIL_RE.test(form['support.email']))
    e['support.email'] = 'Invalid email';
  return Object.keys(e).length ? fail(e) : pass();
}