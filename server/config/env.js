'use strict';

require('dotenv').config();

const Joi = require('joi');

const schema = Joi.object({
  // APP
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(5000),
  APP_NAME: Joi.string().default('HDM Technologies'),
  APP_URL: Joi.string().uri().required(),
  ADMIN_URL: Joi.string().uri().required(),
  PROVIDER_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().required(),

  // DATABASE
  MONGODB_URI: Joi.string().pattern(/^mongodb(\+srv)?:\/\//).required(),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  // RADIUS
  RADIUS_SHARED_SECRET: Joi.string().min(8).required(),
  RADIUS_DEFAULT_SESSION_TIMEOUT: Joi.number().integer().positive().default(3600),
  RADIUS_ACCT_INTERIM_INTERVAL: Joi.number().integer().positive().default(300),
  RADIUS_RATE_LIMIT_ATTRIBUTE: Joi.string().default('Mikrotik-Rate-Limit'),

  // MIKROTIK
  MIKROTIK_API_PORT: Joi.number().integer().default(8728),
  MIKROTIK_API_TLS_PORT: Joi.number().integer().default(8729),
  MIKROTIK_CONNECT_TIMEOUT: Joi.number().integer().positive().default(10000),
  MIKROTIK_RECONNECT_INTERVAL: Joi.number().integer().positive().default(5000),

  // M-PESA
  MPESA_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),
  MPESA_BASE_URL: Joi.string().uri().required(),
  MPESA_CONSUMER_KEY: Joi.string().required(),
  MPESA_CONSUMER_SECRET: Joi.string().required(),
  MPESA_SHORTCODE: Joi.string().required(),
  MPESA_TILL_NUMBER: Joi.string().allow('').default(''),
  MPESA_PASSKEY: Joi.string().required(),
  MPESA_CALLBACK_URL: Joi.string().uri().pattern(/^https:\/\//).required(),
  MPESA_TRANSACTION_TYPE: Joi.string()
    .valid('CustomerPayBillOnline', 'CustomerBuyGoodsOnline')
    .default('CustomerBuyGoodsOnline'),

  // CLOUDINARY
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  CLOUDINARY_FOLDER_VOUCHERS: Joi.string().default('vouchers'),
  CLOUDINARY_FOLDER_LOGOS: Joi.string().default('logos'),

  // HDM BRIDGE
  HDM_API_KEY: Joi.string().pattern(/^hdm_/).required(),
  HDM_API_URL: Joi.string().uri().required(),
  HDM_FROM_EMAIL: Joi.string().email().required(),
  HDM_FROM_NAME: Joi.string().required(),
  HDM_SMS_SENDER: Joi.string().max(11).default('HDMBRIDGE'),
  HDM_TIMEOUT: Joi.number().integer().positive().default(10000),
  HDM_RETRY_COUNT: Joi.number().integer().min(0).default(2),
  HDM_SMS_ENABLED: Joi.boolean().default(true),
  HDM_EMAIL_ENABLED: Joi.boolean().default(true),

  // VOUCHER
  VOUCHER_CODE_LENGTH: Joi.number().integer().min(6).default(10),
  VOUCHER_CODE_PREFIX: Joi.string().allow('').default(''),
  VOUCHER_DEFAULT_EXPIRY_DAYS: Joi.number().integer().positive().default(30),

  // CRYPTO
  ROUTER_CRED_KEY: Joi.string()
    .required()
    .custom((value, helpers) => {
      let buf;
      try {
        buf = Buffer.from(value, 'base64');
      } catch {
        return helpers.error('any.invalid');
      }
      if (buf.length !== 32) return helpers.error('any.invalid');
      return value;
    }, 'ROUTER_CRED_KEY validation')
    .messages({
      'any.invalid': 'ROUTER_CRED_KEY must be base64 encoding of exactly 32 bytes',
    }),

  // SCHEDULERS
  RUN_SCHEDULERS_IN_PROCESS: Joi.boolean().default(true),
}).unknown(true);

const { error, value } = schema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  console.error('[config] Environment validation failed:');
  error.details.forEach((d) => console.error(`  - ${d.message}`));
  process.exit(1);
}

if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
  console.error('[config] JWT_SECRET and JWT_REFRESH_SECRET must differ.');
  process.exit(1);
}

if (value.JWT_SECRET === value.RADIUS_SHARED_SECRET) {
  console.error('[config] JWT_SECRET and RADIUS_SHARED_SECRET must differ.');
  process.exit(1);
}

if (
  value.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline' &&
  !value.MPESA_TILL_NUMBER
) {
  console.error(
    '[config] MPESA_TILL_NUMBER is required when MPESA_TRANSACTION_TYPE is CustomerBuyGoodsOnline.'
  );
  process.exit(1);
}

const expectedMpesaHost =
  value.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

if (value.MPESA_BASE_URL !== expectedMpesaHost) {
  console.warn(
    `[config] MPESA_BASE_URL (${value.MPESA_BASE_URL}) does not match MPESA_ENV (${value.MPESA_ENV}). Expected ${expectedMpesaHost}.`
  );
}

const corsOrigins = value.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!corsOrigins.includes(value.ADMIN_URL)) {
  console.warn('[config] CORS_ORIGINS does not include ADMIN_URL.');
}
if (!corsOrigins.includes(value.PROVIDER_URL)) {
  console.warn('[config] CORS_ORIGINS does not include PROVIDER_URL.');
}

module.exports = {
  nodeEnv: value.NODE_ENV,
  port: value.PORT,
  appName: value.APP_NAME,
  appUrl: value.APP_URL,
  adminUrl: value.ADMIN_URL,
  providerUrl: value.PROVIDER_URL,
  corsOrigins,

  mongodbUri: value.MONGODB_URI,

  jwt: {
    secret: value.JWT_SECRET,
    refreshSecret: value.JWT_REFRESH_SECRET,
    accessExpires: value.JWT_ACCESS_EXPIRES,
    refreshExpires: value.JWT_REFRESH_EXPIRES,
  },

  radius: {
    sharedSecret: value.RADIUS_SHARED_SECRET,
    defaultSessionTimeout: value.RADIUS_DEFAULT_SESSION_TIMEOUT,
    acctInterimInterval: value.RADIUS_ACCT_INTERIM_INTERVAL,
    rateLimitAttribute: value.RADIUS_RATE_LIMIT_ATTRIBUTE,
  },

  mikrotik: {
    apiPort: value.MIKROTIK_API_PORT,
    apiTlsPort: value.MIKROTIK_API_TLS_PORT,
    connectTimeout: value.MIKROTIK_CONNECT_TIMEOUT,
    reconnectInterval: value.MIKROTIK_RECONNECT_INTERVAL,
  },

  mpesa: {
    env: value.MPESA_ENV,
    baseUrl: value.MPESA_BASE_URL,
    consumerKey: value.MPESA_CONSUMER_KEY,
    consumerSecret: value.MPESA_CONSUMER_SECRET,
    shortCode: value.MPESA_SHORTCODE,
    tillNumber: value.MPESA_TILL_NUMBER,
    passkey: value.MPESA_PASSKEY,
    callbackUrl: value.MPESA_CALLBACK_URL,
    transactionType: value.MPESA_TRANSACTION_TYPE,
  },

  cloudinary: {
    cloudName: value.CLOUDINARY_CLOUD_NAME,
    apiKey: value.CLOUDINARY_API_KEY,
    apiSecret: value.CLOUDINARY_API_SECRET,
    vouchersFolder: value.CLOUDINARY_FOLDER_VOUCHERS,
    logosFolder: value.CLOUDINARY_FOLDER_LOGOS,
  },

  hdm: {
    apiKey: value.HDM_API_KEY,
    apiUrl: value.HDM_API_URL,
    fromEmail: value.HDM_FROM_EMAIL,
    fromName: value.HDM_FROM_NAME,
    smsSender: value.HDM_SMS_SENDER,
    timeout: value.HDM_TIMEOUT,
    retryCount: value.HDM_RETRY_COUNT,
    smsEnabled: value.HDM_SMS_ENABLED,
    emailEnabled: value.HDM_EMAIL_ENABLED,
  },

  voucher: {
    codeLength: value.VOUCHER_CODE_LENGTH,
    codePrefix: value.VOUCHER_CODE_PREFIX,
    defaultExpiryDays: value.VOUCHER_DEFAULT_EXPIRY_DAYS,
  },

  crypto: {
    key: value.ROUTER_CRED_KEY,
  },

  schedulers: {
    runInProcess: value.RUN_SCHEDULERS_IN_PROCESS,
  },
};