'use strict';

const config = require('./env');

module.exports = {
  apiPort: config.mikrotik.apiPort,
  apiTlsPort: config.mikrotik.apiTlsPort,
  connectTimeout: config.mikrotik.connectTimeout,
  reconnectInterval: config.mikrotik.reconnectInterval,
};