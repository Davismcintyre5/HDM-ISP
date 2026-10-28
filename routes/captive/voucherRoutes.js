'use strict';

const express = require('express');
const router = express.Router();

const voucher = require('../../controllers/captive/voucherController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.get('/validate', rateLimiter.captive, voucher.validate);
router.post('/redeem', rateLimiter.auth, voucher.redeem);

module.exports = router;