'use strict';

const bcrypt = require('bcryptjs');
const ProviderUser = require('../../models/provider/User');
const Provider = require('../../models/admin/Provider');
const ApiError = require('../../utils/apiError');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const cloudinaryService = require('../../services/cloudinaryService');
const ProviderSettings = require('../../models/provider/Settings');

async function getProfile(req, res) {
  const user = await ProviderUser.findById(req.user.id).lean();
  if (!user) throw ApiError.notFound('Provider account not found');

  const provider = await Provider.findOne({ userId: user._id })
    .populate('billingPlanId', 'name billingCycle trialDays price currency')
    .lean();
  if (!provider) throw ApiError.notFound('Provider record not found');

  const logoSetting = await ProviderSettings.findOne({
    providerId: provider._id,
    key: 'branding.logoUrl',
  }).lean();

  return success(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    },
    provider: {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      status: provider.status,
      billingStatus: provider.billingStatus,
      billingPlan: provider.billingPlanId,
      subscriptionEndsAt: provider.subscriptionEndsAt,
      logoUrl: logoSetting?.value || provider.logoUrl || '',
    },
  });
}

async function updateProfile(req, res) {
  const { name, businessName, phone } = req.body;

  const user = await ProviderUser.findById(req.user.id);
  if (!user) throw ApiError.notFound('Provider account not found');

  const provider = await Provider.findOne({ userId: user._id });
  if (!provider) throw ApiError.notFound('Provider record not found');

  const userUpdates = {};
  if (name !== undefined) userUpdates.name = String(name).trim();
  if (phone !== undefined) userUpdates.phone = String(phone).trim();

  const providerUpdates = {};
  if (businessName !== undefined) providerUpdates.name = String(businessName).trim();
  if (phone !== undefined) providerUpdates.phone = String(phone).trim();

  if (Object.keys(userUpdates).length) {
    await ProviderUser.updateOne({ _id: user._id }, { $set: userUpdates });
  }
  if (Object.keys(providerUpdates).length) {
    await Provider.updateOne({ _id: provider._id }, { $set: providerUpdates });
  }

  return getProfile(req, res);
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('currentPassword and newPassword required');
  }
  if (String(newPassword).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  const user = await ProviderUser.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('Provider account not found');

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return success(res, { changed: true });
}

async function uploadAvatar(req, res) {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('No file uploaded');
  }
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(req.file.mimetype)) {
    throw ApiError.badRequest('Only PNG, JPG, WEBP, or GIF allowed');
  }
  if (req.file.size > 2 * 1024 * 1024) {
    throw ApiError.badRequest('Image must be under 2 MB');
  }

  const provider = await Provider.findOne({ userId: req.user.id });
  if (!provider) throw ApiError.notFound('Provider record not found');

  const uploaded = await cloudinaryService.uploadLogo(req.file.buffer, provider._id);

  await ProviderSettings.updateOne(
    { providerId: provider._id, key: 'branding.logoUrl' },
    { $set: { value: uploaded.url, description: 'Provider logo URL' } },
    { upsert: true }
  );
  await Provider.updateOne(
    { _id: provider._id },
    { $set: { logoUrl: uploaded.url } }
  );

  return success(res, { logoUrl: uploaded.url, publicId: uploaded.publicId });
}

module.exports = {
  getProfile: asyncHandler(getProfile),
  updateProfile: asyncHandler(updateProfile),
  changePassword: asyncHandler(changePassword),
  uploadAvatar: asyncHandler(uploadAvatar),
};