'use strict';

const PlatformSettings = require('../../models/admin/PlatformSettings');
const Legal = require('../../models/admin/Legal');
const PaymentMethod = require('../../models/admin/PaymentMethod');
const BillingPlan = require('../../models/admin/BillingPlan');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const PUBLIC_SETTING_KEYS = [
  'branding.logoUrl',
  'branding.faviconUrl',
  'branding.logoDarkUrl',
  'branding.faviconDarkUrl',
  'branding.primaryColor',
  'branding.appName',
  'support.phone',
  'support.email',
  'support.website',
  'default_currency',
  'default_country',
  'registration_open',
  'maintenance_mode',
];

async function getSettings(req, res) {
  const docs = await PlatformSettings.find({ key: { $in: PUBLIC_SETTING_KEYS } }).lean();
  const map = {};
  for (const d of docs) map[d.key] = d.value;
  return success(res, map);
}

async function getPlans(req, res) {
  const plans = await BillingPlan.find({ status: 'active' })
    .select('name description price currency billingCycle trialDays features')
    .sort({ price: 1 })
    .lean();
  return success(res, plans);
}

async function getPaymentMethods(req, res) {
  const methods = await PaymentMethod.find({ enabled: true })
    .sort({ order: 1 })
    .select('code label mode config')
    .lean();

  const sanitized = methods.map((m) => ({
    code: m.code,
    label: m.label,
    mode: m.mode,
    config: sanitizeConfig(m.code, m.config),
  }));

  return success(res, sanitized);
}

async function getLegalList(req, res) {
  const docs = await Legal.find({ isActive: true })
    .select('type title version effectiveFrom')
    .sort({ type: 1 })
    .lean();
  return success(res, docs);
}

async function getLegalByType(req, res) {
  const { type } = req.params;
  const doc = await Legal.findOne({ type, isActive: true }).lean();
  if (!doc) throw ApiError.notFound('Legal document not found');
  return success(res, {
    type: doc.type,
    title: doc.title,
    content: doc.content,
    version: doc.version,
    effectiveFrom: doc.effectiveFrom,
  });
}

function sanitizeConfig(code, config = {}) {
  const PUBLIC_FIELDS = {
    cash: ['name'],
    mpesa_send: ['phone', 'name'],
    mpesa_till: ['tillNumber', 'name'],
    mpesa_paybill: ['paybillNumber', 'accountNumber', 'name'],
    bank: ['bankName', 'accountName', 'accountNumber', 'branch', 'swift'],
    mpesa_stk: ['shortcode', 'name'],
  };
  const allowed = PUBLIC_FIELDS[code] || [];
  const out = {};
  for (const k of allowed) {
    if (config[k] !== undefined && config[k] !== null && config[k] !== '') {
      out[k] = config[k];
    }
  }
  return out;
}

module.exports = {
  getSettings: asyncHandler(getSettings),
  getPlans: asyncHandler(getPlans),
  getPaymentMethods: asyncHandler(getPaymentMethods),
  getLegalList: asyncHandler(getLegalList),
  getLegalByType: asyncHandler(getLegalByType),
};