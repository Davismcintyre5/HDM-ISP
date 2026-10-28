'use strict';

const express = require('express');
const router = express.Router();

router.use('/portal', require('./portalRoutes'));
router.use('/payment', require('./paymentRoutes'));
router.use('/voucher', require('./voucherRoutes'));

module.exports = router;