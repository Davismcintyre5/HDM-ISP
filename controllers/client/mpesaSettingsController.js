'use strict';

const PaymentMethod = require('../../models/provider/PaymentMethod');
const mpesaService = require('../../services/mpesaService');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');
const { encrypt, decrypt } = require('../../utils/crypto');

const MODES = ['own', 'shared', 'global'];
const TRANSACTION_TYPES = ['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'];

function mask(value, keep = 4) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= keep) return '****';
  return s.slice(0, keep) + '****';
}

async function readConfig(providerId) {
  const doc = await PaymentMethod.findOne({
    providerId,
    code: 'mpesa_stk',
  }).lean();
  return doc?.config || { mode: 'global' };
}

async function writeConfig(providerId, newConfig) {
  await PaymentMethod.updateOne(
    { providerId, code: 'mpesa_stk' },
    {
      $set: {
        providerId,
        code: 'mpesa_stk',
        displayName: 'M-Pesa',
        isEnabled: true,
        config: newConfig,
      },
      $setOnInsert: { sortOrder: 1 },
    },
    { upsert: true }
  );
}

function buildPublicShape(cfg) {
  const mode = cfg.mode || 'global';
  return {
    mode,
    fields: {
      consumerKey: cfg.consumerKey || '',
      consumerSecretSet: Boolean(cfg.consumerSecret),
      passkeySet: Boolean(cfg.passkey),
      shortcode: cfg.shortcode || '',
      tillNumber: cfg.tillNumber || '',
      transactionType: cfg.transactionType || 'CustomerBuyGoodsOnline',
    },
    callbackUrl: config.mpesa.callbackUrl,
    platformShortcode: mask(config.mpesa.shortCode),
    platformTill: mask(config.mpesa.tillNumber),
  };
}

const getMpesaSettings = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const cfg = await readConfig(providerId);
  return success(res, buildPublicShape(cfg));
});

const updateMpesaSettings = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const body = req.body || {};
  const mode = String(body.mode || '').trim();

  if (!MODES.includes(mode)) {
    throw ApiError.badRequest('Invalid mode. Use own, shared, or global.');
  }

  const existing = await readConfig(providerId);

  if (mode === 'global') {
    const forbidden = [
      'consumerKey',
      'consumerSecret',
      'passkey',
      'shortcode',
      'tillNumber',
      'transactionType',
    ];
    for (const f of forbidden) {
      if (body[f] !== undefined && body[f] !== '') {
        throw ApiError.badRequest(`${f} is not allowed in global mode.`);
      }
    }

    await writeConfig(providerId, { mode: 'global' });
    return success(res, buildPublicShape(await readConfig(providerId)));
  }

  if (mode === 'shared') {
    if (body.consumerKey || body.consumerSecret || body.passkey) {
      throw ApiError.badRequest(
        'consumerKey, consumerSecret, and passkey are not allowed in shared mode.'
      );
    }

    const shortcode = String(body.shortcode || '').trim();
    const tillNumber = String(body.tillNumber || '').trim();
    const transactionType = String(body.transactionType || '').trim();

    if (!shortcode && !tillNumber) {
      throw ApiError.badRequest('Provide either a shortcode or a till number.');
    }
    if (!TRANSACTION_TYPES.includes(transactionType)) {
      throw ApiError.badRequest('Invalid transactionType.');
    }
    if (transactionType === 'CustomerBuyGoodsOnline' && !tillNumber) {
      throw ApiError.badRequest('Till number is required for Buy Goods.');
    }
    if (transactionType === 'CustomerPayBillOnline' && !shortcode) {
      throw ApiError.badRequest('Shortcode is required for Paybill.');
    }
    if (shortcode && !/^\d{5,7}$/.test(shortcode)) {
      throw ApiError.badRequest('Shortcode must be 5 to 7 digits.');
    }
    if (tillNumber && !/^\d{5,7}$/.test(tillNumber)) {
      throw ApiError.badRequest('Till number must be 5 to 7 digits.');
    }

    await writeConfig(providerId, {
      mode: 'shared',
      shortcode,
      tillNumber,
      transactionType,
    });

    return success(res, buildPublicShape(await readConfig(providerId)));
  }

  // mode === 'own'
  const consumerKey = String(body.consumerKey || '').trim();
  const consumerSecret = String(body.consumerSecret || '').trim();
  const passkey = String(body.passkey || '').trim();
  const shortcode = String(body.shortcode || '').trim();
  const tillNumber = String(body.tillNumber || '').trim();
  const transactionType = String(body.transactionType || '').trim();

  if (!consumerKey) {
    throw ApiError.badRequest('consumerKey is required in own mode.');
  }

  const hasStoredSecret = Boolean(existing.consumerSecret);
  if (!consumerSecret && !hasStoredSecret) {
    throw ApiError.badRequest('consumerSecret is required in own mode.');
  }

  const hasStoredPasskey = Boolean(existing.passkey);
  if (!passkey && !hasStoredPasskey) {
    throw ApiError.badRequest('passkey is required in own mode.');
  }

  if (!shortcode && !tillNumber) {
    throw ApiError.badRequest('Provide either a shortcode or a till number.');
  }
  if (!TRANSACTION_TYPES.includes(transactionType)) {
    throw ApiError.badRequest('Invalid transactionType.');
  }
  if (transactionType === 'CustomerBuyGoodsOnline' && !tillNumber) {
    throw ApiError.badRequest('Till number is required for Buy Goods.');
  }
  if (transactionType === 'CustomerPayBillOnline' && !shortcode) {
    throw ApiError.badRequest('Shortcode is required for Paybill.');
  }
  if (shortcode && !/^\d{5,7}$/.test(shortcode)) {
    throw ApiError.badRequest('Shortcode must be 5 to 7 digits.');
  }
  if (tillNumber && !/^\d{5,7}$/.test(tillNumber)) {
    throw ApiError.badRequest('Till number must be 5 to 7 digits.');
  }

  const newConfig = {
    mode: 'own',
    consumerKey,
    shortcode,
    tillNumber,
    transactionType,
    consumerSecret: consumerSecret
      ? encrypt(consumerSecret)
      : existing.consumerSecret,
    passkey: passkey ? encrypt(passkey) : existing.passkey,
  };

  await writeConfig(providerId, newConfig);

  return success(res, buildPublicShape(await readConfig(providerId)));
});

const testMpesaSettings = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const cfg = await readConfig(providerId);
  const mode = cfg.mode || 'global';

  if (mode === 'global') {
    return success(res, {
      ok: false,
      error: 'Global mode uses platform credentials — nothing to test.',
    });
  }

  let consumerKey;
  let consumerSecret;

  if (mode === 'own') {
    consumerKey = cfg.consumerKey;
    if (!consumerKey || !cfg.consumerSecret) {
      return success(res, { ok: false, error: 'Credentials not saved yet.' });
    }
    try {
      consumerSecret = decrypt(cfg.consumerSecret);
    } catch {
      return success(res, { ok: false, error: 'Failed to decrypt stored credentials.' });
    }
  } else {
    consumerKey = config.mpesa.consumerKey;
    consumerSecret = config.mpesa.consumerSecret;
  }

  const axios = require('axios');
  const baseUrl =
    config.mpesa.env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const { data } = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` }, timeout: 15000 }
    );

    return success(res, {
      ok: true,
      tokenExpiresIn: Number(data.expires_in) || 3599,
    });
  } catch (err) {
    const body = err.response?.data;
    return success(res, {
      ok: false,
      error:
        body?.errorMessage ||
        body?.error_description ||
        err.message ||
        'Credential test failed',
    });
  }
});

module.exports = {
  getMpesaSettings,
  updateMpesaSettings,
  testMpesaSettings,
};