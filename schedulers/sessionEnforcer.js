'use strict';

const sessionService = require('../services/sessionService');

module.exports = async function sessionEnforcer() {
  const result = await sessionService.enforceSessionLimits();
  if (result.processed > 0) {
    console.log(`[sessionEnforcer] processed ${result.processed}`);
  }
};