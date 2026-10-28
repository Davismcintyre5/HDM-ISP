'use strict';

const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

const SAFARICOM_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69',
];

function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).replace(/^::ffff:/, '').trim();
}

function extractClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    if (first) return normalizeIp(first);
  }
  return normalizeIp(req.ip);
}

module.exports = function mpesaIpAllowlist(req, res, next) {
  if (env.mpesa.env !== 'production') return next();

  const ip = extractClientIp(req);

  if (!SAFARICOM_IPS.includes(ip)) {
    console.warn('[mpesa] callback rejected — IP not allowed', {
      ip,
      reqIp: req.ip,
      xff: req.headers['x-forwarded-for'] || null,
      path: req.originalUrl,
    });
    return next(ApiError.forbidden('Source IP not allowed'));
  }

  next();
};