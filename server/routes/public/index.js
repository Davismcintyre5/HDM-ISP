'use strict';

const express = require('express');
const router = express.Router();

const sharedSecret = require('../../middleware/global/sharedSecret');

router.use('/auth', require('./authRoutes'));
router.use('/webhooks', require('./webhookRoutes'));
router.use('/radius', sharedSecret, require('./radiusRoutes'));
router.use('/site', require('./siteRoutes'));
router.use('/legal', require('./legalRoutes'));

module.exports = router;