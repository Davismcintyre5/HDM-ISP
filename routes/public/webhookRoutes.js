'use strict';

const express = require('express');
const router = express.Router();

const webhook = require('../../controllers/public/webhookController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.post('/mpesa', rateLimiter.callback, webhook.mpesaCallback);

module.exports = router;