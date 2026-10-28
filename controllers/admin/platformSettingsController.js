'use strict';

const PlatformSettings = require('../../models/admin/PlatformSettings');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.find().sort({ key: 1 });
  const map = {};
  for (const s of settings) map[s.key] = s.value;
  return success(res, map);
});

const getOne = asyncHandler(async (req, res) => {
  const setting = await PlatformSettings.findOne({ key: req.params.key });
  if (!setting) throw ApiError.notFound('Setting not found');
  return success(res, setting);
});

const update = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (value === undefined) throw ApiError.badRequest('value required');

  const setting = await PlatformSettings.findOneAndUpdate(
    { key: req.params.key },
    { $set: { value } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return success(res, setting);
});

const bulkUpdate = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') throw ApiError.badRequest('settings object required');

  const ops = Object.entries(settings).map(([key, value]) => ({
    updateOne: { filter: { key }, update: { $set: { key, value } }, upsert: true },
  }));
  if (ops.length) await PlatformSettings.bulkWrite(ops);

  return success(res, { updated: ops.length });
});

module.exports = { list, getOne, update, bulkUpdate };