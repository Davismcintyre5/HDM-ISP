'use strict';

const BillingPlan = require('../../models/admin/BillingPlan');
const ApiError = require('../../utils/apiError');
const { success, created } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const plans = await BillingPlan.find().sort({ price: 1 });
  return success(res, plans);
});

const getOne = asyncHandler(async (req, res) => {
  const plan = await BillingPlan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Billing plan not found');
  return success(res, plan);
});

const create = asyncHandler(async (req, res) => {
  const {
    name, description, price, currency, billingCycle,
    maxRouters, maxCustomers, maxSites, features,
  } = req.body;

  if (!name || price === undefined) {
    throw ApiError.badRequest('name and price required');
  }

  const exists = await BillingPlan.findOne({ name });
  if (exists) throw ApiError.conflict('Billing plan with this name already exists');

  const plan = await BillingPlan.create({
    name,
    description,
    price,
    currency: currency || 'KES',
    billingCycle: billingCycle || 'monthly',
    maxRouters: maxRouters ?? 1,
    maxCustomers: maxCustomers ?? 100,
    maxSites: maxSites ?? 1,
    features: features || [],
    status: 'active',
  });

  return created(res, plan);
});

const update = asyncHandler(async (req, res) => {
  const allowed = [
    'name', 'description', 'price', 'currency', 'billingCycle',
    'maxRouters', 'maxCustomers', 'maxSites', 'features', 'status',
  ];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (!Object.keys(updates).length) {
    throw ApiError.badRequest('Nothing to update');
  }

  if (updates.name) {
    const dupe = await BillingPlan.findOne({ name: updates.name, _id: { $ne: req.params.id } });
    if (dupe) throw ApiError.conflict('Billing plan with this name already exists');
  }

  const plan = await BillingPlan.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!plan) throw ApiError.notFound('Billing plan not found');
  return success(res, plan);
});

const remove = asyncHandler(async (req, res) => {
  const plan = await BillingPlan.findByIdAndDelete(req.params.id);
  if (!plan) throw ApiError.notFound('Billing plan not found');
  return success(res, { deleted: true });
});

module.exports = { list, getOne, create, update, remove };