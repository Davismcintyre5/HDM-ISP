'use strict';

const bcrypt = require('bcryptjs');
const Admin = require('../../models/admin/Admin');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');
const emailService = require('../../services/emailService');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Admin.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Admin.countDocuments(),
  ]);
  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, adminRole } = req.body;
  if (!name || !email) throw ApiError.badRequest('name and email required');

  const exists = await Admin.findOne({ email: String(email).toLowerCase() });
  if (exists) throw ApiError.conflict('Email already exists');

  const plainPassword = password || 'Temp@1234';
  const hash = await bcrypt.hash(plainPassword, 10);

  const admin = await Admin.create({
    name,
    email: String(email).toLowerCase(),
    password: hash,
    adminRole: adminRole || 'support',
    status: 'active',
  });

  await emailService.sendStaffWelcome({
    to: admin.email,
    fullName: admin.name,
    businessName: config.appName,
    email: admin.email,
    temporaryPassword: plainPassword,
    role: admin.adminRole,
    loginUrl: `${config.adminUrl}/login`,
  }).catch(() => {});

  return created(res, admin);
});

const update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'adminRole', 'status'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

  const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!admin) throw ApiError.notFound('Admin not found');
  return success(res, admin);
});

const remove = asyncHandler(async (req, res) => {
  const target = await Admin.findById(req.params.id);
  if (!target) throw ApiError.notFound('Admin not found');

  const activeCount = await Admin.countDocuments({ status: 'active' });
  if (target.status === 'active' && activeCount <= 1) {
    throw ApiError.badRequest('Cannot delete the last active admin');
  }

  await Admin.deleteOne({ _id: target._id });
  return success(res, { deleted: true });
});

module.exports = { list, create, update, remove };