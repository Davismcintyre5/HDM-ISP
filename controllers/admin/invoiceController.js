'use strict';

const Invoice = require('../../models/admin/Invoice');
const ApiError = require('../../utils/apiError');
const { success, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, providerId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (providerId) filter.providerId = providerId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Invoice.countDocuments(filter),
  ]);
  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return success(res, invoice);
});

module.exports = { list, getOne };