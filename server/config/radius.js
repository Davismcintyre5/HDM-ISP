'use strict';

const config = require('./env');

module.exports = {
  sharedSecret: config.radius.sharedSecret,
  endpoints: {
    check: '/api/public/radius/check',
    auth: '/api/public/radius/auth',
    accounting: '/api/public/radius/accounting',
  },
  defaultSessionTimeout: config.radius.defaultSessionTimeout,
  acctInterimInterval: config.radius.acctInterimInterval,
  rateLimitAttribute: config.radius.rateLimitAttribute,
};