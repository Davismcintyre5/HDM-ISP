'use strict';

const express = require('express');
const router = express.Router();

const portal = require('../../controllers/captive/portalController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.get('/plans', rateLimiter.captive, portal.getPlans);
router.get('/status', rateLimiter.captive, portal.status);
router.post('/login', rateLimiter.captive, portal.login);

module.exports = router;