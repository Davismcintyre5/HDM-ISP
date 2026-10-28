'use strict';

const PlatformSettings = require('../../models/admin/PlatformSettings');
const Legal = require('../../models/admin/Legal');
const PaymentMethod = require('../../models/admin/PaymentMethod');
const BillingPlan = require('../../models/admin/BillingPlan');
const Provider = require('../../models/admin/Provider');
const Plan = require('../../models/provider/Plan');
const Router = require('../../models/provider/Router');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getProviderSettings } = require('../../utils/settings');

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
  const { providerId, nasIpAddress } = req.query;

  let provider = null;

  if (providerId) {
    provider = await Provider.findById(providerId).lean();
  } else if (nasIpAddress) {
    const router = await Router.findOne({ ipAddress: nasIpAddress }).lean();
    if (router) {
      provider = await Provider.findById(router.providerId).lean();
    }
  }

  if (!provider) {
    throw ApiError.notFound('Provider not found for this router');
  }

  const plans = await Plan.find({ providerId: provider._id, status: 'active' })
    .select('name description price currency validityUnit validityValue rateLimitDownKbps rateLimitUpKbps dataCapMb')
    .sort({ price: 1 })
    .lean();

  const settings = await getProviderSettings(provider._id);

  return success(res, {
    provider: {
      id: provider._id,
      name: provider.name,
      slug: provider.slug || null,
      logoUrl: settings['branding.logoUrl'] || provider.logoUrl || '',
      primaryColor: settings['branding.primaryColor'] || '#2563eb',
      supportPhone: settings['support.phone'] || provider.phone || '',
      supportEmail: settings['support.email'] || provider.email || '',
    },
    plans,
  });
}

async function getProviderBySlug(req, res) {
  const { slug } = req.params;
  if (!slug) throw ApiError.badRequest('slug required');

  const provider = await Provider.findOne({
    slug: String(slug).toLowerCase(),
    status: 'active',
  }).lean();
  if (!provider) throw ApiError.notFound('Provider not found');

  const [settings, plans] = await Promise.all([
    getProviderSettings(provider._id),
    Plan.find({ providerId: provider._id, status: 'active' })
      .select('name description price currency validityUnit validityValue rateLimitDownKbps rateLimitUpKbps dataCapMb')
      .sort({ price: 1 })
      .lean(),
  ]);

  return success(res, {
    provider: {
      id: provider._id,
      name: provider.name,
      slug: provider.slug,
      logoUrl: settings['branding.logoUrl'] || provider.logoUrl || '',
      primaryColor: settings['branding.primaryColor'] || '#2563eb',
      supportPhone: settings['support.phone'] || provider.phone || '',
      supportEmail: settings['support.email'] || provider.email || '',
      portalUrl: `https://${provider.slug}.hdm.co.ke`,
    },
    plans,
  });
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

async function getPublicPlans(req, res) {
  const plans = await BillingPlan.find({ status: 'active' })
    .select('name description price currency billingCycle trialDays features')
    .sort({ price: 1 })
    .lean();
  return success(res, plans);
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
  getProviderBySlug: asyncHandler(getProviderBySlug),
  getPaymentMethods: asyncHandler(getPaymentMethods),
  getLegalList: asyncHandler(getLegalList),
  getLegalByType: asyncHandler(getLegalByType),
  getPublicPlans: asyncHandler(getPublicPlans),
};