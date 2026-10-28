'use strict';

const express = require('express');
const router = express.Router();

const payment = require('../../controllers/captive/paymentController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.post('/stk', rateLimiter.captive, payment.initiateStk);
router.get('/status/:checkoutRequestId', rateLimiter.captive, payment.paymentStatus);

module.exports = router;