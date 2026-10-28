'use strict';

const Customer = require('../../models/provider/Customer');
const Plan = require('../../models/provider/Plan');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

function validityMs(plan) {
  const unit = plan.validityUnit;
  const value = plan.validityValue;
  const map = { minutes: 60000, hours: 3600000, days: 86400000, months: 2592000000 };
  return value * (map[unit] || 86400000);
}

const renew = asyncHandler(async (req, res) => {
  const { customerId, planId } = req.body;
  if (!customerId) throw ApiError.badRequest('customerId required');

  const customer = await Customer.findOne({
    _id: customerId,
    providerId: req.user.providerId,
  });
  if (!customer) throw ApiError.notFound('Customer not found');

  let plan;
  if (planId) {
    plan = await Plan.findOne({ _id: planId, providerId: req.user.providerId });
    if (!plan) throw ApiError.notFound('Plan not found');
  } else {
    plan = await Plan.findById(customer.planId);
    if (!plan) throw ApiError.badRequest('Plan must be specified');
  }

  const base = customer.expiresAt && customer.expiresAt > new Date()
    ? customer.expiresAt.getTime()
    : Date.now();

  customer.planId = plan._id;
  customer.expiresAt = new Date(base + validityMs(plan));
  customer.status = 'active';
  await customer.save();

  return success(res, {
    customerId: customer._id,
    planName: plan.name,
    expiresAt: customer.expiresAt,
  });
});

const bulkRenew = asyncHandler(async (req, res) => {
  const { customerIds, planId } = req.body;
  if (!Array.isArray(customerIds) || !customerIds.length) {
    throw ApiError.badRequest('customerIds array required');
  }

  const plan = await Plan.findOne({ _id: planId, providerId: req.user.providerId });
  if (!plan) throw ApiError.notFound('Plan not found');

  const customers = await Customer.find({
    _id: { $in: customerIds },
    providerId: req.user.providerId,
  });

  let renewed = 0;
  for (const customer of customers) {
    const base = customer.expiresAt && customer.expiresAt > new Date()
      ? customer.expiresAt.getTime()
      : Date.now();
    customer.planId = plan._id;
    customer.expiresAt = new Date(base + validityMs(plan));
    customer.status = 'active';
    await customer.save();
    renewed++;
  }

  return success(res, { renewed, requested: customerIds.length });
});

module.exports = { renew, bulkRenew };