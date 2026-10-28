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

module.exports = function mpesaIpAllowlist(req, res, next) {
  if (env.mpesa.env !== 'production') return next();

  const ip = String(req.ip || '').replace(/^::ffff:/, '').trim();

  if (!SAFARICOM_IPS.includes(ip)) {
    console.warn('[mpesa] callback rejected — IP not allowed', {
      ip,
      path: req.originalUrl,
    });
    return next(ApiError.forbidden('Source IP not allowed'));
  }

  next();
};