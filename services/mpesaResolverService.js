'use strict';

const PaymentMethod = require('../models/provider/PaymentMethod');
const { decrypt } = require('../utils/crypto');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

const PLATFORM_DEFAULTS = {
  consumerKey: config.mpesa.consumerKey,
  consumerSecret: config.mpesa.consumerSecret,
  passkey: config.mpesa.passkey,
  shortcode: config.mpesa.shortCode,
  tillNumber: config.mpesa.tillNumber,
  transactionType: config.mpesa.transactionType,
  callbackUrl: config.mpesa.callbackUrl,
};

function platformConfig(mode = 'global', providerId = null) {
  return {
    mode,
    providerId,
    consumerKey: PLATFORM_DEFAULTS.consumerKey,
    consumerSecret: PLATFORM_DEFAULTS.consumerSecret,
    passkey: PLATFORM_DEFAULTS.passkey,
    shortcode: PLATFORM_DEFAULTS.shortcode,
    tillNumber: PLATFORM_DEFAULTS.tillNumber,
    transactionType: PLATFORM_DEFAULTS.transactionType,
    callbackUrl: PLATFORM_DEFAULTS.callbackUrl,
    accountOwner: 'platform',
  };
}

async function resolveMpesaConfig(providerId) {
  if (!providerId) {
    throw ApiError.badRequest('providerId required to resolve M-Pesa config');
  }

  const doc = await PaymentMethod.findOne({
    providerId,
    code: 'mpesa_stk',
  }).lean();

  const cfg = doc?.config || {};
  const mode = cfg.mode || 'global';

  if (mode === 'global') {
    return platformConfig('global', providerId);
  }

  if (mode === 'shared') {
    if (!cfg.shortcode && !cfg.tillNumber) {
      throw ApiError.badRequest(
        'Provider M-Pesa not configured: shortcode or till number missing'
      );
    }

    return {
      mode: 'shared',
      providerId,
      consumerKey: PLATFORM_DEFAULTS.consumerKey,
      consumerSecret: PLATFORM_DEFAULTS.consumerSecret,
      passkey: PLATFORM_DEFAULTS.passkey,
      shortcode: cfg.shortcode || '',
      tillNumber: cfg.tillNumber || '',
      transactionType: cfg.transactionType || 'CustomerBuyGoodsOnline',
      callbackUrl: PLATFORM_DEFAULTS.callbackUrl,
      accountOwner: 'provider',
    };
  }

  if (mode === 'own') {
    if (!cfg.consumerKey || !cfg.consumerSecret) {
      throw ApiError.badRequest(
        'Provider M-Pesa not configured: consumer credentials missing'
      );
    }
    if (!cfg.shortcode && !cfg.tillNumber) {
      throw ApiError.badRequest(
        'Provider M-Pesa not configured: shortcode or till number missing'
      );
    }

    let consumerSecret;
    let passkey;
    try {
      consumerSecret = decrypt(cfg.consumerSecret);
      passkey = cfg.passkey ? decrypt(cfg.passkey) : '';
    } catch (err) {
      throw ApiError.internal(
        'Failed to decrypt provider M-Pesa credentials. Re-save in settings.'
      );
    }

    return {
      mode: 'own',
      providerId,
      consumerKey: cfg.consumerKey,
      consumerSecret,
      passkey,
      shortcode: cfg.shortcode || '',
      tillNumber: cfg.tillNumber || '',
      transactionType: cfg.transactionType || 'CustomerBuyGoodsOnline',
      callbackUrl: PLATFORM_DEFAULTS.callbackUrl,
      accountOwner: 'provider',
    };
  }

  throw ApiError.badRequest(`Unknown M-Pesa mode: ${mode}`);
}

function sanitizeForLog(cfg) {
  if (!cfg) return null;
  return {
    mode: cfg.mode,
    providerId: cfg.providerId,
    shortcode: cfg.shortcode,
    tillNumber: cfg.tillNumber,
    transactionType: cfg.transactionType,
    accountOwner: cfg.accountOwner,
    hasConsumerKey: Boolean(cfg.consumerKey),
    hasConsumerSecret: Boolean(cfg.consumerSecret),
    hasPasskey: Boolean(cfg.passkey),
  };
}

module.exports = {
  resolveMpesaConfig,
  sanitizeForLog,
};