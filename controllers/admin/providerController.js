'use strict';

const bcrypt = require('bcryptjs');
const Provider = require('../../models/admin/Provider');
const ProviderUser = require('../../models/provider/User');
const BillingPlan = require('../../models/admin/BillingPlan');
const ApiError = require('../../utils/apiError');
const { success, created, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const notificationService = require('../../services/notificationService');
const { seedProvider } = require('../../utils/settings');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Provider.find(filter)
      .populate('billingPlanId', 'name price currency')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Provider.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.params.id)
    .populate('billingPlanId')
    .populate('userId', 'name email phone status lastLoginAt');
  if (!provider) throw ApiError.notFound('Provider not found');
  return success(res, provider);
});

const create = asyncHandler(async (req, res) => {
  const { name, email, phone, password, billingPlanId } = req.body;
  if (!name || !email) throw ApiError.badRequest('name and email required');

  const exists = await Provider.findOne({ email: String(email).toLowerCase() });
  if (exists) throw ApiError.conflict('Email already exists');

  const userExists = await ProviderUser.findOne({ email: String(email).toLowerCase() });
  if (userExists) throw ApiError.conflict('Provider login email already exists');

  const passwordHash = await bcrypt.hash(password || 'Temp@1234', 10);

  const user = await ProviderUser.create({
    name,
    email: String(email).toLowerCase(),
    phone,
    password: passwordHash,
    status: 'active',
  });

  const provider = await Provider.create({
    userId: user._id,
    name,
    email: String(email).toLowerCase(),
    phone,
    status: 'active',
    billingPlanId: billingPlanId || null,
    billingStatus: 'active',
  });

  await seedProvider(provider._id).catch(() => {});

  await emailService.sendStaffWelcome({
    to: email,
    fullName: name,
    businessName: name,
    email,
    temporaryPassword: password || 'Temp@1234',
    role: 'provider',
    loginUrl: `${config.providerUrl}/login`,
  }).catch(() => {});

  return created(res, provider);
});

const update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'logoUrl', 'billingPlanId', 'billingStatus', 'status'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  const provider = await Provider.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!provider) throw ApiError.notFound('Provider not found');
  return success(res, provider);
});

const suspend = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const provider = await Provider.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'suspended', billingStatus: 'suspended' } },
    { new: true }
  );
  if (!provider) throw ApiError.notFound('Provider not found');

  await emailService.sendSuspended({
    to: provider.email,
    providerName: provider.name,
    reason,
    suspendedAt: new Date(),
  }).catch(() => {});
  await smsService.sendSuspended({ to: provider.phone, reason }).catch(() => {});
  if (provider.userId) {
    await notificationService.notifyProvider(provider.userId, {
      type: 'account_suspended',
      title: 'Account suspended',
      body: reason || 'Your account has been suspended.',
      link: '/billing',
    }).catch(() => {});
  }

  return success(res, provider);
});

const activate = asyncHandler(async (req, res) => {
  const provider = await Provider.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'active', billingStatus: 'active' } },
    { new: true }
  ).populate('billingPlanId');
  if (!provider) throw ApiError.notFound('Provider not found');

  await emailService.sendReactivated({
    to: provider.email,
    providerName: provider.name,
    planName: provider.billingPlanId?.name,
    dashboardUrl: `${config.providerUrl}/dashboard`,
  }).catch(() => {});
  await smsService.sendReactivated({ to: provider.phone }).catch(() => {});
  if (provider.userId) {
    await notificationService.notifyProvider(provider.userId, {
      type: 'account_reactivated',
      title: 'Account reactivated',
      body: 'Your account is active again.',
      link: '/dashboard',
    }).catch(() => {});
  }

  return success(res, provider);
});

const approveSubscription = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.params.id).populate('billingPlanId');
  if (!provider) throw ApiError.notFound('Provider not found');

  const now = new Date();
  const cycle = provider.billingPlanId?.billingCycle || 'monthly';
  const end = new Date(now);
  if (cycle === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (cycle === 'quarterly') end.setMonth(end.getMonth() + 3);
  else if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);

  provider.status = 'active';
  provider.billingStatus = 'active';
  provider.subscriptionEndsAt = end;
  provider.subscriptionExpiredAt = null;
  provider.subscriptionNoticesSent = [];
  await provider.save();

  await emailService.sendApproved({
    to: provider.email,
    providerName: provider.name,
    planName: provider.billingPlanId?.name || 'Plan',
    periodStart: now.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    dashboardUrl: `${config.providerUrl}/dashboard`,
  }).catch(() => {});
  await smsService.sendApproved({ to: provider.phone, planName: provider.billingPlanId?.name || 'Plan' }).catch(() => {});
  if (provider.userId) {
    await notificationService.notifyProvider(provider.userId, {
      type: 'account_approved',
      title: 'Account approved',
      body: 'Your subscription is now active.',
      link: '/dashboard',
    }).catch(() => {});
  }

  return success(res, provider);
});

const reject = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const provider = await Provider.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'suspended' } },
    { new: true }
  );
  if (!provider) throw ApiError.notFound('Provider not found');

  await emailService.sendRejection({
    to: provider.email,
    name: provider.name,
    businessName: provider.name,
    reason,
  }).catch(() => {});

  return success(res, provider);
});

const remove = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.params.id);
  if (!provider) throw ApiError.notFound('Provider not found');

  if (provider.userId) await ProviderUser.deleteOne({ _id: provider.userId });
  await Provider.deleteOne({ _id: provider._id });

  return success(res, { deleted: true });
});

module.exports = { list, getOne, create, update, suspend, activate, approveSubscription, reject, remove };