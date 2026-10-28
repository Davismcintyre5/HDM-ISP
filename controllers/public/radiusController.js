'use strict';

const radiusService = require('../../services/radiusService');
const ApiError = require('../../utils/apiError');
const asyncHandler = require('../../utils/asyncHandler');

const check = asyncHandler(async (req, res) => {
  const { username, providerId } = req.body;
  if (!username) throw ApiError.badRequest('username required');

  const result = await radiusService.checkUser({ username, providerId });

  if (!result.found) {
    return res.status(200).json({
      found: false,
      reason: result.reason || 'not_found',
    });
  }

  return res.status(200).json({
    found: true,
    username: result.customer.username,
    providerId: result.customer.providerId,
    status: result.customer.status,
    expiresAt: result.customer.expiresAt,
  });
});

const auth = asyncHandler(async (req, res) => {
  const { username, password, providerId } = req.body;
  if (!username || password === undefined) {
    throw ApiError.badRequest('username and password required');
  }

  const result = await radiusService.authenticateUser({
    username,
    password,
    providerId,
  });

  if (!result.authorized) {
    return res.status(200).json({
      authorized: false,
      reason: result.reason || 'unauthorized',
    });
  }

  return res.status(200).json({
    authorized: true,
    attributes: result.attributes || [],
  });
});

const accounting = asyncHandler(async (req, res) => {
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
  } = req.body;

  if (!sessionId || !username) {
    throw ApiError.badRequest('sessionId and username required');
  }

  await radiusService.processAccounting({
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
  });

  return res.status(200).json({ recorded: true });
});

module.exports = { check, auth, accounting };