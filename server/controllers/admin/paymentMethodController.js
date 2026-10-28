'use strict';

const PaymentMethod = require('../../models/admin/PaymentMethod');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const methods = await PaymentMethod.find().sort({ order: 1 });
  return success(res, methods);
});

const update = asyncHandler(async (req, res) => {
  const { enabled, config, label } = req.body;
  const updates = {};
  if (enabled !== undefined) updates.enabled = enabled;
  if (config !== undefined) updates.config = config;
  if (label !== undefined) updates.label = label;

  if (!Object.keys(updates).length) throw ApiError.badRequest('Nothing to update');

  const method = await PaymentMethod.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!method) throw ApiError.notFound('Payment method not found');
  return success(res, method);
});

module.exports = { list, update };