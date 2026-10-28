'use strict';

const express = require('express');
const router = express.Router();

const webhook = require('../../controllers/public/webhookController');
const rateLimiter = require('../../middleware/global/rateLimiter');
const mpesaIpAllowlist = require('../../middleware/global/mpesaIpAllowlist');

router.post('/mpesa', rateLimiter.callback, mpesaIpAllowlist, webhook.mpesaCallback);

module.exports = router;