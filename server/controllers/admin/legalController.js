'use strict';

const Legal = require('../../models/admin/Legal');
const ApiError = require('../../utils/apiError');
const { success, created } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const docs = await Legal.find().sort({ type: 1 });
  return success(res, docs);
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await Legal.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Legal doc not found');
  return success(res, doc);
});

const create = asyncHandler(async (req, res) => {
  const { type, title, content, version } = req.body;
  if (!type || !title || !content) throw ApiError.badRequest('type, title, content required');

  const exists = await Legal.findOne({ type });
  if (exists) throw ApiError.conflict('A legal doc of this type already exists');

  const doc = await Legal.create({
    type,
    title,
    content,
    version: version || '1.0',
    isActive: true,
    effectiveFrom: new Date(),
    createdByAdminId: req.user.id,
  });
  return created(res, doc);
});

const update = asyncHandler(async (req, res) => {
  const allowed = ['title', 'content', 'version', 'isActive'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const doc = await Legal.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!doc) throw ApiError.notFound('Legal doc not found');
  return success(res, doc);
});

const remove = asyncHandler(async (req, res) => {
  const doc = await Legal.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Legal doc not found');
  return success(res, { deleted: true });
});

module.exports = { list, getOne, create, update, remove };