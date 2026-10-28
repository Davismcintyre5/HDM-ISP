'use strict';

const Customer = require('../../models/provider/Customer');
const Plan = require('../../models/provider/Plan');
const Router = require('../../models/provider/Router');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const mikrotikService = require('../../services/mikrotikService');

const list = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const { page = 1, limit = 20, status, search } = req.query;

  const filter = { providerId };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { macAddress: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('planId', 'name price currency validityUnit validityValue')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Customer.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    providerId: req.user.providerId,
  }).populate('planId', 'name price currency validityUnit validityValue rateLimitDownKbps rateLimitUpKbps');
  if (!customer) throw ApiError.notFound('Customer not found');
  return success(res, customer);
});

const create = asyncHandler(async (req, res) => {
  const { username, phone, email, macAddress, planId, expiresAt } = req.body;
  if (!username) throw ApiError.badRequest('username required');

  const exists = await Customer.findOne({ providerId: req.user.providerId, username });
  if (exists) throw ApiError.conflict('Customer username already exists');

  let plan = null;
  if (planId) {
    plan = await Plan.findOne({ _id: planId, providerId: req.user.providerId });
    if (!plan) throw ApiError.notFound('Plan not found');
  }

  const customer = await Customer.create({
    providerId: req.user.providerId,
    planId: plan?._id || null,
    username,
    phone,
    email,
    macAddress: macAddress ? String(macAddress).toLowerCase() : undefined,
    status: 'active',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  return created(res, customer);
});

const suspend = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, providerId: req.user.providerId },
    { $set: { status: 'suspended' } },
    { new: true }
  );
  if (!customer) throw ApiError.notFound('Customer not found');

  const router = await Router.findOne({
    providerId: req.user.providerId,
    status: 'online',
  }).select('+apiPasswordEnc +radiusSecretEnc');

  if (router) {
    await mikrotikService
      .disconnectUser(router, customer.username)
      .catch((err) =>
        console.error('[customerController] disconnect failed:', err.message)
      );
  }

  return success(res, customer);
});

const activate = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, providerId: req.user.providerId },
    { $set: { status: 'active' } },
    { new: true }
  );
  if (!customer) throw ApiError.notFound('Customer not found');
  return success(res, customer);
});

const remove = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({
    _id: req.params.id,
    providerId: req.user.providerId,
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  return success(res, { deleted: true });
});

module.exports = { list, getOne, create, suspend, activate, remove };