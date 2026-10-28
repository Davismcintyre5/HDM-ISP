'use strict';

const Customer = require('../../models/provider/Customer');
const Plan = require('../../models/provider/Plan');
const Router = require('../../models/provider/Router');
const Provider = require('../../models/admin/Provider');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

async function resolveProviderFromNas(nasIpAddress) {
  if (!nasIpAddress) return null;
  const router = await Router.findOne({ ipAddress: nasIpAddress }).lean();
  if (!router) return null;
  const provider = await Provider.findById(router.providerId).lean();
  return provider || null;
}

async function resolveProviderBySlug(slug) {
  if (!slug) return null;
  const provider = await Provider.findOne({ email: new RegExp(`^${slug}@`, 'i') }).lean();
  return provider || null;
}

const getPlans = asyncHandler(async (req, res) => {
  const { providerId, nasIpAddress } = req.query;
  if (!providerId && !nasIpAddress) {
    throw ApiError.badRequest('providerId or nasIpAddress required');
  }

  let provider = null;
  if (providerId) {
    provider = await Provider.findById(providerId).lean();
  } else {
    provider = await resolveProviderFromNas(nasIpAddress);
  }
  if (!provider) throw ApiError.notFound('Provider not found');

  const plans = await Plan.find({ providerId: provider._id, status: 'active' })
    .select('name type price currency validityUnit validityValue rateLimitDownKbps rateLimitUpKbps dataCapMb')
    .sort({ price: 1 })
    .lean();

  return success(res, {
    provider: {
      id: provider._id,
      name: provider.name,
    },
    plans,
  });
});

const status = asyncHandler(async (req, res) => {
  const { username, macAddress } = req.query;
  if (!username && !macAddress) {
    throw ApiError.badRequest('username or macAddress required');
  }

  const query = {};
  if (username) query.username = username;
  if (macAddress) query.macAddress = String(macAddress).toLowerCase();

  const customer = await Customer.findOne(query).populate('planId').lean();
  if (!customer) {
    return success(res, { active: false, reason: 'not_found' });
  }

  if (customer.status === 'suspended') {
    return success(res, { active: false, reason: 'suspended' });
  }

  if (customer.expiresAt && customer.expiresAt < new Date()) {
    return success(res, { active: false, reason: 'expired', expiresAt: customer.expiresAt });
  }

  return success(res, {
    active: true,
    username: customer.username,
    planName: customer.planId?.name || null,
    expiresAt: customer.expiresAt,
    dataUsedMb: customer.dataUsedMb || 0,
    dataCapMb: customer.planId?.dataCapMb || 0,
  });
});

const login = asyncHandler(async (req, res) => {
  const { username, macAddress, nasIpAddress } = req.body;
  if (!username) throw ApiError.badRequest('username required');

  const customer = await Customer.findOne({ username }).populate('planId').lean();
  if (!customer) throw ApiError.notFound('User not found');

  if (customer.status === 'suspended') {
    throw ApiError.forbidden('Account suspended');
  }

  if (customer.expiresAt && customer.expiresAt < new Date()) {
    throw ApiError.forbidden('Plan expired');
  }

  if (macAddress && customer.macAddress && customer.macAddress !== String(macAddress).toLowerCase()) {
    throw ApiError.forbidden('Device mismatch');
  }

  if (nasIpAddress) {
    const router = await Router.findOne({ ipAddress: nasIpAddress }).lean();
    if (router && String(router.providerId) !== String(customer.providerId)) {
      throw ApiError.forbidden('Provider mismatch for this router');
    }
  }

  await Customer.updateOne(
    { _id: customer._id },
    {
      $set: {
        lastLoginAt: new Date(),
        macAddress: macAddress ? String(macAddress).toLowerCase() : customer.macAddress,
      },
    }
  );

  return success(res, {
    authorized: true,
    username: customer.username,
    planName: customer.planId?.name || null,
    rateLimitDownKbps: customer.planId?.rateLimitDownKbps || 0,
    rateLimitUpKbps: customer.planId?.rateLimitUpKbps || 0,
    expiresAt: customer.expiresAt,
  });
});

module.exports = { getPlans, status, login };