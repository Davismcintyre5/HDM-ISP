'use strict';

const ProviderSettings = require('../../models/provider/Settings');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const docs = await ProviderSettings.find({ providerId: req.user.providerId }).lean();
  const map = {};
  for (const d of docs) map[d.key] = d.value;
  return success(res, map);
});

const update = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) throw ApiError.badRequest('value required');

  const setting = await ProviderSettings.findOneAndUpdate(
    { providerId: req.user.providerId, key },
    { $set: { value } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return success(res, setting);
});

const bulkUpdate = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    throw ApiError.badRequest('settings object required');
  }

  const providerId = req.user.providerId;
  const ops = Object.entries(settings).map(([key, value]) => ({
    updateOne: {
      filter: { providerId, key },
      update: { $set: { providerId, key, value } },
      upsert: true,
    },
  }));
  if (ops.length) await ProviderSettings.bulkWrite(ops);

  return success(res, { updated: ops.length });
});

module.exports = { list, update, bulkUpdate };