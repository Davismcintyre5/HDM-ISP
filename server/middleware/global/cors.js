'use strict';

const cors = require('cors');
const config = require('../../config/env');

const allowed = new Set(config.corsOrigins);

module.exports = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowed.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
});