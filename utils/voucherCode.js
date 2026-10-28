'use strict';

const crypto = require('crypto');
const config = require('../config/env');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateVoucherCode(length = config.voucher.codeLength, prefix = config.voucher.codePrefix) {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix || ''}${out}`;
}

function formatVoucherForDisplay(code) {
  if (!code) return '';
  return String(code).replace(/(.{4})(?=.)/g, '$1-');
}

function isVoucherFormatValid(code) {
  if (!code || typeof code !== 'string') return false;
  const stripped = code.replace(/-/g, '').toUpperCase();
  return /^[A-Z0-9]+$/.test(stripped) && stripped.length >= 6 && stripped.length <= 32;
}

module.exports = {
  generateVoucherCode,
  formatVoucherForDisplay,
  isVoucherFormatValid,
};