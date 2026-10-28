'use strict';

const PendingProvider = require('../../models/admin/PendingProvider');
const Provider = require('../../models/admin/Provider');
const ProviderUser = require('../../models/provider/User');
const ApiError = require('../../utils/apiError');
const { success, paginated } = require('../../utils/apiResponse');
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
      { businessName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    PendingProvider.find(filter)
      .populate('billingPlanId', 'name price currency billingCycle trialDays')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    PendingProvider.countDocuments(filter),
  ]);

  return paginated(res, items, { page: Number(page), limit: Number(limit), total });
});

const getOne = asyncHandler(async (req, res) => {
  const pending = await PendingProvider.findById(req.params.id)
    .populate('billingPlanId')
    .populate('invoiceId')
    .populate('transactionId');
  if (!pending) throw ApiError.notFound('Pending provider not found');
  return success(res, pending);
});

const approve = asyncHandler(async (req, res) => {
  const pending = await PendingProvider.findById(req.params.id)
    .select('+passwordHash')
    .populate('billingPlanId');

  if (!pending) throw ApiError.notFound('Pending provider not found');
  if (pending.status === 'approved') throw ApiError.badRequest('Already approved');
  if (pending.status === 'rejected') throw ApiError.badRequest('Was rejected');
  if (pending.status === 'expired') throw ApiError.badRequest('Registration expired');

  const lower = String(pending.email).toLowerCase();

  const [existsUser, existsProvider] = await Promise.all([
    ProviderUser.findOne({ email: lower }),
    Provider.findOne({ email: lower }),
  ]);
  if (existsUser || existsProvider) {
    throw ApiError.conflict('Provider account already exists for this email');
  }

  const user = await ProviderUser.create({
    name: pending.name,
    email: lower,
    phone: pending.phone,
    password: pending.passwordHash,
    status: 'active',
  });

  const plan = pending.billingPlanId;
  const now = new Date();
  let subscriptionEndsAt = null;

  if (plan?.billingCycle === 'trial') {
    subscriptionEndsAt = new Date(
      now.getTime() + (plan.trialDays || 14) * 24 * 60 * 60 * 1000
    );
  } else if (plan?.billingCycle === 'monthly') {
    subscriptionEndsAt = new Date(now);
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
  }

  const businessName = pending.businessName || pending.name;

  const provider = await Provider.create({
    userId: user._id,
    name: businessName,
    email: lower,
    phone: pending.phone,
    status: 'active',
    billingPlanId: plan?._id || null,
    billingStatus: 'active',
    subscriptionEndsAt,
    subscriptionExpiredAt: null,
    subscriptionNoticesSent: [],
  });

  await seedProvider(provider._id).catch(() => {});

  pending.status = 'approved';
  pending.approvedAt = now;
  await pending.save();

  emailService
    .sendApproved({
      to: provider.email,
      providerName: businessName,
      planName: plan?.name || 'Plan',
      periodStart: now.toISOString().slice(0, 10),
      periodEnd: subscriptionEndsAt
        ? subscriptionEndsAt.toISOString().slice(0, 10)
        : 'never',
      dashboardUrl: `${config.providerUrl}/dashboard`,
    })
    .catch(() => {});

  if (provider.phone) {
    smsService
      .sendApproved({
        to: provider.phone,
        planName: plan?.name || 'Plan',
      })
      .catch(() => {});
  }

  await notificationService
    .notifyProvider(user._id, {
      type: 'account_approved',
      title: 'Account approved',
      body: 'Your subscription is now active.',
      link: '/dashboard',
    })
    .catch(() => {});

  return success(res, { provider, pending });
});

const reject = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const pending = await PendingProvider.findById(req.params.id);
  if (!pending) throw ApiError.notFound('Pending provider not found');
  if (pending.status === 'approved') throw ApiError.badRequest('Already approved');
  if (pending.status === 'rejected') throw ApiError.badRequest('Already rejected');

  pending.status = 'rejected';
  pending.rejectedAt = new Date();
  pending.rejectionReason = reason || null;
  await pending.save();

  emailService
    .sendRejection({
      to: pending.email,
      name: pending.name,
      businessName: pending.businessName || pending.name,
      reason,
    })
    .catch(() => {});

  return success(res, pending);
});

const remove = asyncHandler(async (req, res) => {
  const pending = await PendingProvider.findById(req.params.id);
  if (!pending) throw ApiError.notFound('Pending provider not found');

  await PendingProvider.deleteOne({ _id: pending._id });
  return success(res, { deleted: true });
});

const expireStale = asyncHandler(async (req, res) => {
  const result = await PendingProvider.updateMany(
    {
      status: { $in: ['unverified', 'verified', 'awaiting_payment', 'awaiting_approval'] },
      expiresAt: { $lt: new Date() },
    },
    { $set: { status: 'expired' } }
  );
  return success(res, { expired: result.modifiedCount });
});

module.exports = { list, getOne, approve, reject, remove, expireStale };