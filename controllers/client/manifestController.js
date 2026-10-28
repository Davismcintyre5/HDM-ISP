'use strict';

const Provider = require('../../models/admin/Provider');
const Settings = require('../../models/provider/Settings');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const KEYS = ['branding.appName', 'branding.logoUrl', 'branding.primaryColor'];

async function loadSettings(providerId) {
  const docs = await Settings.find({
    providerId,
    key: { $in: KEYS },
  }).lean();
  const map = {};
  for (const doc of docs) map[doc.key] = doc.value;
  return map;
}

const getManifest = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.user.providerId).lean();
  if (!provider) {
    return res.status(404).json({ success: false, message: 'Provider not found' });
  }

  const settings = await loadSettings(provider._id);

  const appName =
    settings['branding.appName'] || provider.name || 'HDM Provider';
  const shortName = String(appName).split(/\s+/)[0].slice(0, 12);
  const themeColor = settings['branding.primaryColor'] || '#2563eb';
  const providerLogo = settings['branding.logoUrl'] || null;

  const frontendOrigin = String(config.providerUrl).replace(/\/+$/, '');

  const icons = [];

  if (providerLogo) {
    icons.push(
      { src: providerLogo, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: providerLogo, sizes: '512x512', type: 'image/png', purpose: 'any' }
    );
  }

  for (const s of PWA_SIZES) {
    icons.push({
      src: `${frontendOrigin}/icon-${s}.png`,
      sizes: `${s}x${s}`,
      type: 'image/png',
      purpose: 'any',
    });
  }
  for (const s of MASKABLE_SIZES) {
    icons.push({
      src: `${frontendOrigin}/maskable-${s}.png`,
      sizes: `${s}x${s}`,
      type: 'image/png',
      purpose: 'maskable',
    });
  }

  const manifest = {
    id: `${frontendOrigin}/`,
    name: appName,
    short_name: shortName,
    description: `${appName} — hotspot billing and voucher management.`,
    start_url: `${frontendOrigin}/dashboard`,
    scope: `${frontendOrigin}/`,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: themeColor,
    lang: 'en-KE',
    categories: ['business', 'productivity', 'utilities'],
    icons,
  };

  res.set('Content-Type', 'application/manifest+json');
  res.set('Cache-Control', 'private, max-age=0, must-revalidate');
  res.send(JSON.stringify(manifest));
});

module.exports = { getManifest };