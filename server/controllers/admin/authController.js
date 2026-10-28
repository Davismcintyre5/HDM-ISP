'use strict';

const bcrypt = require('bcryptjs');
const Admin = require('../../models/admin/Admin');
const ApiError = require('../../utils/apiError');
const { success, created } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password required');

  const admin = await Admin.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!admin) throw ApiError.unauthorized('Invalid credentials');
  if (admin.status !== 'active') throw ApiError.forbidden('Account suspended');

  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });

  const payload = { sub: String(admin._id), role: 'admin', adminRole: admin.adminRole };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: String(admin._id), role: 'admin' });

  return success(res, {
    accessToken,
    refreshToken,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      adminRole: admin.adminRole,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken required');

  const decoded = verifyRefreshToken(refreshToken);
  const admin = await Admin.findById(decoded.sub);
  if (!admin || admin.status !== 'active') throw ApiError.unauthorized('Invalid refresh token');

  const payload = { sub: String(admin._id), role: 'admin', adminRole: admin.adminRole };
  return success(res, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: String(admin._id), role: 'admin' }),
  });
});

const me = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user.id);
  if (!admin) throw ApiError.notFound('Admin not found');
  return success(res, admin);
});

const logout = asyncHandler(async (req, res) => {
  return success(res, { loggedOut: true });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw ApiError.badRequest('currentPassword and newPassword required');
  if (newPassword.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');

  const admin = await Admin.findById(req.user.id).select('+password');
  if (!admin) throw ApiError.notFound('Admin not found');

  const ok = await bcrypt.compare(currentPassword, admin.password);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();

  return success(res, { changed: true });
});

module.exports = { login, refresh, me, logout, changePassword };