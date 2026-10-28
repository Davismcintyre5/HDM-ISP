'use strict';

const PlatformSettings = require('../models/admin/PlatformSettings');
const ProviderSettings = require('../models/provider/Settings');
const config = require('../config/env');

async function getPlatformSettings() {
  const docs = await PlatformSettings.find({}).lean();
  const map = {};
  for (const d of docs) map[d.key] = d.value;
  return map;
}

async function getPlatformSetting(key, fallback = null) {
  const doc = await PlatformSettings.findOne({ key }).lean();
  return doc ? doc.value : fallback;
}

async function getProviderSettings(providerId) {
  const docs = await ProviderSettings.find({ providerId }).lean();
  const map = {};
  for (const d of docs) map[d.key] = d.value;
  return map;
}

async function getProviderSetting(providerId, key, fallback = null) {
  const doc = await ProviderSettings.findOne({ providerId, key }).lean();
  return doc ? doc.value : fallback;
}

async function resolvePlatformBrand() {
  const s = await getPlatformSettings();

  const name = s['branding.appName'] || config.appName;
  const primary = s['branding.primaryColor'] || '#2563eb';

  return {
    name,
    appName: name,
    logoUrl: s['branding.logoUrl'] || '',
    faviconUrl: s['branding.faviconUrl'] || '',
    logoDarkUrl: s['branding.logoDarkUrl'] || '',
    faviconDarkUrl: s['branding.faviconDarkUrl'] || '',
    primaryColor: primary,
    color: primary,
    accent: primary,
    supportPhone: s['support.phone'] || '',
    supportEmail: s['support.email'] || '',
    website: s['support.website'] || '',
    adminUrl: config.adminUrl,
    providerUrl: config.providerUrl,
    portalUrl: config.appUrl,
  };
}

async function resolveProviderBrand(providerId, providerDoc = null) {
  const s = await getProviderSettings(providerId);

  const name =
    s['branding.portalTitle'] ||
    providerDoc?.name ||
    config.appName;
  const primary = s['branding.primaryColor'] || '#2563eb';

  return {
    name,
    appName: name,
    logoUrl: s['branding.logoUrl'] || providerDoc?.logoUrl || '',
    faviconUrl: s['branding.faviconUrl'] || '',
    logoDarkUrl: s['branding.logoDarkUrl'] || '',
    faviconDarkUrl: s['branding.faviconDarkUrl'] || '',
    primaryColor: primary,
    color: primary,
    accent: primary,
    supportPhone: s['support.phone'] || providerDoc?.phone || '',
    supportEmail: s['support.email'] || providerDoc?.email || '',
    website: s['support.website'] || '',
    portalTitle: name,
    welcomeMessage: s['portal.welcomeMessage'] || '',
    footerText: s['portal.footerText'] || '',
    portalUrl: config.appUrl,
  };
}

async function resolveBrandFor(providerId = null) {
  const platform = await resolvePlatformBrand();
  if (!providerId) return { platform, provider: null, brand: platform };
  const provider = await resolveProviderBrand(providerId);
  return { platform, provider, brand: provider };
}

async function seedProvider(providerId) {
  const defaults = [
    { key: 'branding.logoUrl', value: '', description: 'Provider logo URL' },
    { key: 'branding.faviconUrl', value: '', description: 'Provider favicon URL' },
    { key: 'branding.logoDarkUrl', value: '', description: 'Provider logo URL (dark mode)' },
    { key: 'branding.faviconDarkUrl', value: '', description: 'Provider favicon URL (dark mode)' },
    { key: 'branding.primaryColor', value: '#2563eb', description: 'Provider primary color' },
    { key: 'branding.portalTitle', value: '', description: 'Captive portal title' },
    { key: 'support.phone', value: '', description: 'Support phone number' },
    { key: 'support.email', value: '', description: 'Support email address' },
    { key: 'support.whatsapp', value: '', description: 'Support WhatsApp number' },
    { key: 'support.hours', value: '', description: 'Support operating hours' },
    { key: 'notifications.smsEnabled', value: true, description: 'Send SMS notifications' },
    { key: 'notifications.emailEnabled', value: true, description: 'Send email notifications' },
    { key: 'notifications.senderName', value: '', description: 'SMS/email sender name override' },
    { key: 'portal.welcomeMessage', value: '', description: 'Captive portal welcome text' },
    { key: 'portal.footerText', value: '', description: 'Captive portal footer text' },
    { key: 'billing.currency', value: 'KES', description: 'Billing currency' },
    { key: 'billing.invoicePrefix', value: '', description: 'Invoice number prefix' },
  ];

  const ops = defaults.map((d) => ({
    updateOne: {
      filter: { providerId, key: d.key },
      update: { $setOnInsert: { ...d, providerId } },
      upsert: true,
    },
  }));

  if (ops.length) await ProviderSettings.bulkWrite(ops);
}

module.exports = {
  getPlatformSettings,
  getPlatformSetting,
  getProviderSettings,
  getProviderSetting,
  resolvePlatformBrand,
  resolveProviderBrand,
  resolveBrandFor,
  seedProvider,
};