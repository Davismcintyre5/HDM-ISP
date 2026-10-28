'use strict';

const rateLimit = require('express-rate-limit');

const standardHeaders = true;
const legacyHeaders = false;

const captive = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many requests' },
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many login attempts' },
});

const callback = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many callback requests' },
});

const radius = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many RADIUS requests' },
});

module.exports = { captive, auth, callback, radius };