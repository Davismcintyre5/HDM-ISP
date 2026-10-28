'use strict';

const bcrypt = require('bcryptjs');
const Customer = require('../models/provider/Customer');
const Provider = require('../models/admin/Provider');
const Plan = require('../models/provider/Plan');
const Session = require('../models/admin/Session');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

function formatRateLimit(downKbps, upKbps) {
  const kb = (n) => (n >= 1000 ? `${Math.round(n / 1000)}M` : `${n}k`);
  return `${kb(downKbps)}/${kb(upKbps)}`;
}

function buildAcceptAttributes(customer, plan) {
  const attrs = [];
  if (plan) {
    const rate = formatRateLimit(plan.rateLimitDownKbps, plan.rateLimitUpKbps);
    attrs.push({ name: config.radius.rateLimitAttribute, value: rate });
  }
  attrs.push({
    name: 'Session-Timeout',
    value: String(config.radius.defaultSessionTimeout),
  });
  attrs.push({
    name: 'Acct-Interim-Interval',
    value: String(config.radius.acctInterimInterval),
  });
  return attrs;
}

async function checkUser({ username, providerId }) {
  if (!username) throw ApiError.badRequest('username required');

  const query = { username };
  if (providerId) query.providerId = providerId;

  const customer = await Customer.findOne(query)
    .select('+passwordHash')
    .populate('planId');

  if (!customer) return { found: false, reason: 'user_not_found' };

  if (customer.status === 'suspended') {
    return { found: false, reason: 'user_suspended' };
  }

  if (customer.expiresAt && customer.expiresAt < new Date()) {
    return { found: false, reason: 'user_expired' };
  }

  return { found: true, customer };
}

async function authenticateUser({ username, password, providerId }) {
  const { found, customer, reason } = await checkUser({ username, providerId });
  if (!found) return { authorized: false, reason };

  if (!customer.passwordHash) {
    return { authorized: false, reason: 'no_password_set' };
  }

  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) return { authorized: false, reason: 'wrong_password' };

  const attrs = buildAcceptAttributes(customer, customer.planId);

  await Customer.updateOne(
    { _id: customer._id },
    { $set: { lastLoginAt: new Date() } }
  );

  return { authorized: true, attributes: attrs };
}

async function processAccounting(data) {
  const {
    sessionId,
    username,
    providerId,
    nasIpAddress,
    statusType,
    startTime,
    stopTime,
    bytesIn,
    bytesOut,
    terminateCause,
  } = data;

  if (!sessionId || !username) {
    throw ApiError.badRequest('sessionId and username required');
  }

  if (statusType === 'Start') {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          sessionId,
          username,
          providerId,
          nasIpAddress,
          startTime: startTime || new Date(),
        },
      },
      { upsert: true }
    );
    return { recorded: true };
  }

  if (statusType === 'Interim-Update' || statusType === 'Stop') {
    const update = {};
    if (bytesIn !== undefined) update.bytesIn = Number(bytesIn);
    if (bytesOut !== undefined) update.bytesOut = Number(bytesOut);
    if (statusType === 'Stop') {
      update.stopTime = stopTime || new Date();
      if (terminateCause) update.terminateCause = terminateCause;
    }

    await Session.findOneAndUpdate({ sessionId }, { $set: update });
    return { recorded: true };
  }

  return { recorded: false, reason: 'unknown_status_type' };
}

module.exports = {
  checkUser,
  authenticateUser,
  processAccounting,
  formatRateLimit,
};