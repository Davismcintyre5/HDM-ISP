'use strict';

const Router = require('../../models/provider/Router');
const Provider = require('../../models/admin/Provider');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { encrypt } = require('../../utils/crypto');
const mikrotikService = require('../../services/mikrotikService');

const list = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 50, status } = req.query;

  const filter = { providerId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Router.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Router.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const router = await Router.findOne({ _id: req.params.id, providerId: req.user.providerId });
  if (!router) throw ApiError.notFound('Router not found');
  return success(res, router);
});

const create = asyncHandler(async (req, res) => {
  const { name, ipAddress, apiPort, apiUsername, apiPassword, radiusSecret, siteName } = req.body;

  if (!name || !ipAddress || !apiUsername || !apiPassword || !radiusSecret) {
    throw ApiError.badRequest('name, ipAddress, apiUsername, apiPassword, radiusSecret required');
  }

  const exists = await Router.findOne({ providerId: req.user.providerId, ipAddress });
  if (exists) throw ApiError.conflict('Router with this IP already exists');

  const router = await Router.create({
    providerId: req.user.providerId,
    name,
    ipAddress,
    apiPort: apiPort || 8728,
    apiUsername,
    apiPasswordEnc: encrypt(apiPassword),
    radiusSecretEnc: encrypt(radiusSecret),
    siteName,
    status: 'unknown',
  });

  return created(res, {
    _id: router._id,
    name: router.name,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    apiUsername: router.apiUsername,
    siteName: router.siteName,
    status: router.status,
  });
});

const update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'apiPort', 'apiUsername', 'siteName', 'status'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  if (req.body.apiPassword) updates.apiPasswordEnc = encrypt(req.body.apiPassword);
  if (req.body.radiusSecret) updates.radiusSecretEnc = encrypt(req.body.radiusSecret);
  if (!Object.keys(updates).length) throw ApiError.badRequest('Nothing to update');

  const router = await Router.findOneAndUpdate(
    { _id: req.params.id, providerId: req.user.providerId },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!router) throw ApiError.notFound('Router not found');

  mikrotikService.close(router._id);

  return success(res, {
    _id: router._id,
    name: router.name,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    apiUsername: router.apiUsername,
    siteName: router.siteName,
    status: router.status,
  });
});

const remove = asyncHandler(async (req, res) => {
  const router = await Router.findOneAndDelete({
    _id: req.params.id,
    providerId: req.user.providerId,
  });
  if (!router) throw ApiError.notFound('Router not found');

  mikrotikService.close(router._id);

  return success(res, { deleted: true });
});

const test = asyncHandler(async (req, res) => {
  const router = await Router.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  }).select('+apiPasswordEnc +radiusSecretEnc');
  if (!router) throw ApiError.notFound('Router not found');

  const result = await mikrotikService.testConnection(router);
  if (result.ok) {
    await Router.updateOne(
      { _id: router._id },
      { $set: { status: 'online', lastSeenAt: new Date() } }
    );
  } else {
    await Router.updateOne({ _id: router._id }, { $set: { status: 'offline' } });
  }

  return success(res, result);
});

const activeSessions = asyncHandler(async (req, res) => {
  const router = await Router.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  }).select('+apiPasswordEnc +radiusSecretEnc');
  if (!router) throw ApiError.notFound('Router not found');

  try {
    const sessions = await mikrotikService.getActiveSessions(router);
    return success(res, sessions);
  } catch (err) {
    throw ApiError.badGateway('Failed to fetch active sessions', { error: err.message });
  }
});

module.exports = { list, getOne, create, update, remove, test, activeSessions };