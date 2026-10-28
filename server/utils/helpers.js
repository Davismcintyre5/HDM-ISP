'use strict';

const crypto = require('crypto');

function generateRandomString(length = 16) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sanitizeObject(obj, allowedKeys) {
  const out = {};
  for (const k of allowedKeys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function omitNullish(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

function formatDate(date, locale = 'en-KE', timeZone = 'Africa/Nairobi') {
  return new Date(date).toLocaleString(locale, { timeZone });
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

module.exports = {
  generateRandomString,
  sleep,
  chunkArray,
  sanitizeObject,
  omitNullish,
  formatDate,
  toBoolean,
};