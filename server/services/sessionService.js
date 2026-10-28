'use strict';

const Session = require('../models/admin/Session');
const Customer = require('../models/provider/Customer');
const Plan = require('../models/provider/Plan');
const Router = require('../models/provider/Router');
const mikrotikService = require('./mikrotikService');

async function trackSession({ sessionId, username, providerId, nasIpAddress, bytesIn, bytesOut }) {
  return Session.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        username,
        providerId,
        nasIpAddress,
        bytesIn,
        bytesOut,
      },
    },
    { upsert: true, new: true }
  );
}

async function enforceSessionLimits() {
  const now = new Date();
  const expiredCustomers = await Customer.find({
    status: 'active',
    expiresAt: { $lt: now },
  })
    .populate('planId')
    .limit(500);

  const results = [];
  for (const customer of expiredCustomers) {
    try {
      const router = await Router.findOne({
        providerId: customer.providerId,
        status: 'online',
      });
      if (router) {
        await mikrotikService.disconnectUser(router, customer.username);
      }
      customer.status = 'expired';
      await customer.save();
      await Session.updateMany(
        { username: customer.username, stopTime: null },
        { $set: { stopTime: now, terminateCause: 'Session-Timeout' } }
      );
      results.push({ customerId: customer._id, disconnected: true });
    } catch (err) {
      results.push({ customerId: customer._id, error: err.message });
    }
  }

  return { processed: results.length, results };
}

async function getUserUsage({ username, providerId }) {
  const sessions = await Session.find({ username, providerId }).lean();
  const bytesIn = sessions.reduce((a, s) => a + (s.bytesIn || 0), 0);
  const bytesOut = sessions.reduce((a, s) => a + (s.bytesOut || 0), 0);
  return { sessions: sessions.length, bytesIn, bytesOut, mbTotal: (bytesIn + bytesOut) / (1024 * 1024) };
}

module.exports = {
  trackSession,
  enforceSessionLimits,
  getUserUsage,
};