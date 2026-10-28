'use strict';

const voucherService = require('../services/voucherService');

module.exports = async function voucherExpiry() {
  const result = await voucherService.expireStaleVouchers();
  if (result.expired > 0) {
    console.log(`[voucherExpiry] expired ${result.expired} voucher(s)`);
  }
};