'use strict';

function normalizeToKenyanInternational(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('254')) return p;
  if (p.startsWith('0')) return '254' + p.slice(1);
  if (p.startsWith('7') || p.startsWith('1')) return '254' + p;
  return p;
}

function isValidKenyanNumber(phone) {
  return /^254(7|1)\d{8}$/.test(normalizeToKenyanInternational(phone));
}

module.exports = { normalizeToKenyanInternational, isValidKenyanNumber };