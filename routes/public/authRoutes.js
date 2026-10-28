'use strict';

const express = require('express');
const router = express.Router();

const auth = require('../../controllers/public/authController');
const rateLimiter = require('../../middleware/global/rateLimiter');

router.post('/provider/register', rateLimiter.auth, auth.register);
router.get('/provider/verify-email', rateLimiter.auth, auth.verifyEmail);
router.post('/provider/login', rateLimiter.auth, auth.login);
router.post('/provider/refresh', rateLimiter.auth, auth.refresh);
router.post('/provider/forgot-password', rateLimiter.auth, auth.forgotPassword);

module.exports = router;