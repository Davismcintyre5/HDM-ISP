'use strict';

const express = require('express');
const router = express.Router();

const site = require('../../controllers/public/siteController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.get('/settings', rateLimiter.captive, site.getSettings);
router.get('/plans', rateLimiter.captive, site.getPlans);
router.get('/payment-methods', rateLimiter.captive, site.getPaymentMethods);
router.get('/legal', rateLimiter.captive, site.getLegalList);
router.get('/legal/:type', rateLimiter.captive, site.getLegalByType);

module.exports = router;