'use strict';

const crypto = require('crypto');

function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${date}-${rand}`;
}

module.exports = { generateInvoiceNumber };