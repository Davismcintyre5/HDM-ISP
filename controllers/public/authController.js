'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PendingProvider = require('../../models/admin/PendingProvider');
const Provider = require('../../models/admin/Provider');
const ProviderUser = require('../../models/provider/User');
const ProviderPaymentMethod = require('../../models/provider/PaymentMethod');
const Admin = require('../../models/admin/Admin');
const BillingPlan = require('../../models/admin/BillingPlan');
const ApiError = require('../../utils/apiError');
const { success, created } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const config = require('../../config/env');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const notificationService = require('../../services/notificationService');
const { seedProvider } = require('../../utils/settings');

const VERIFY_TTL_HOURS = 24;
const PENDING_TTL_DAYS = 7;

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function generateUniqueSlug(baseName) {
  const base = slugify(baseName) || 'provider';
  let candidate = base;
  let i = 2;
  while (await Provider.exists({ slug: candidate })) {
    candidate = `${base}-${i}`;
    i++;
  }
  return candidate;
}

function computeSubscriptionEnd(plan, now = new Date()) {
  if (!plan) return null;
  if (plan.billingCycle === 'trial') {
    return new Date(now.getTime() + (plan.trialDays || 14) * 24 * 60 * 60 * 1000);
  }
  if (plan.billingCycle === 'monthly') {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return end;
  }
  return null;
}

function buildProviderPayload(provider) {
  const now = new Date();
  const isSuspended = provider.status === 'suspended';
  const isExpired = Boolean(
    provider.subscriptionEndsAt && provider.subscriptionEndsAt < now
  );
  return {
    id: provider._id,
    name: provider.name,
    slug: provider.slug || null,
    email: provider.email,
    status: provider.status,
    billingStatus: provider.billingStatus,
    subscriptionEndsAt: provider.subscriptionEndsAt,
    isSuspended,
    isExpired,
    portalUrl: provider.slug ? `https://${provider.slug}.hdm.co.ke` : null,
    renewUrl: isSuspended || isExpired ? `${config.providerUrl}/billing` : null,
  };
}

async function seedDefaultMpesaSettings(providerId) {
  try {
    await ProviderPaymentMethod.updateOne(
      { providerId, code: 'mpesa_stk' },
      {
        $setOnInsert: {
          providerId,
          code: 'mpesa_stk',
          displayName: 'M-Pesa',
          isEnabled: true,
          sortOrder: 1,
          config: { mode: 'global' },
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error(
      '[authController] mpesa settings seed failed:',
      err.message
    );
  }
}

const register = asyncHandler(async (req, res) => {
  const { name, businessName, email, phone, password } = req.body;

  if (!name || !businessName || !email || !password) {
    throw ApiError.badRequest('name, businessName, email, password required');
  }
  if (String(password).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  const lower = String(email).toLowerCase();

  const [existsProvider, existsUser, existsPending] = await Promise.all([
    Provider.findOne({ email: lower }),
    ProviderUser.findOne({ email: lower }),
    PendingProvider.findOne({ email: lower }),
  ]);
  if (existsProvider || existsUser) throw ApiError.conflict('Email already registered');
  if (existsPending) throw ApiError.conflict('Registration already in progress for this email');

  const trialPlan = await BillingPlan.findOne({ billingCycle: 'trial', status: 'active' });
  if (!trialPlan) {
    throw ApiError.internal('Free trial plan not configured. Run seed first.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = makeToken();
  const verifyExpires = new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000);
  const pendingExpires = new Date(Date.now() + PENDING_TTL_DAYS * 24 * 60 * 60 * 1000);

  const pending = await PendingProvider.create({
    name,
    businessName,
    email: lower,
    phone,
    passwordHash,
    emailVerificationToken: token,
    emailVerificationExpiresAt: verifyExpires,
    status: 'unverified',
    billingPlanId: trialPlan._id,
    expiresAt: pendingExpires,
  });

  const verifyUrl = `${config.providerUrl}/verify-email?token=${token}`;

  try {
    emailService
      .sendVerification({
        to: lower,
        name,
        verifyUrl,
        expiresIn: `${VERIFY_TTL_HOURS} hours`,
      })
      .catch((err) =>
        console.error('[authController] verification email failed:', err.message)
      );

    Admin.find({ status: 'active' }, 'email')
      .lean()
      .then((admins) => {
        Promise.allSettled(
          admins.map((a) =>
            emailService
              .sendAdminNewProvider({
                to: a.email,
                providerName: businessName,
                providerEmail: lower,
                providerPhone: phone,
                registeredAt: new Date().toISOString(),
                reviewUrl: `${config.adminUrl}/providers/${pending._id}`,
              })
              .catch(() => {})
          )
        );
      })
      .catch(() => {});

    notificationService
      .notifyAdmins({
        type: 'new_provider_registration',
        title: 'New provider registered',
        body: `${businessName} (${name}) registered and is on a 14-day free trial.`,
        link: `/providers/${pending._id}`,
        meta: { pendingProviderId: pending._id },
      })
      .catch(() => {});
  } catch (err) {
    console.error('[authController] register dispatch failed:', err.message);
  }

  return created(res, {
    id: pending._id,
    email: pending.email,
    status: pending.status,
    trialDays: trialPlan.trialDays,
    message:
      'Check your email to verify your account. Your 14-day free trial starts immediately after verification.',
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw ApiError.badRequest('Verification token required');

  const pending = await PendingProvider.findOne({
    emailVerificationToken: token,
    emailVerificationExpiresAt: { $gt: new Date() },
  })
    .select('+emailVerificationToken +passwordHash')
    .populate('billingPlanId');

  if (!pending) throw ApiError.badRequest('Invalid or expired verification token');
  if (pending.status === 'approved') throw ApiError.badRequest('Email already verified');
  if (pending.status !== 'unverified') {
    throw ApiError.badRequest(`Cannot verify from status "${pending.status}"`);
  }

  const lower = String(pending.email).toLowerCase();

  const [existsUser, existsProvider] = await Promise.all([
    ProviderUser.findOne({ email: lower }),
    Provider.findOne({ email: lower }),
  ]);
  if (existsUser || existsProvider) {
    throw ApiError.conflict('Provider account already exists for this email');
  }

  const now = new Date();

  const user = await ProviderUser.create({
    name: pending.name,
    email: lower,
    phone: pending.phone,
    password: pending.passwordHash,
    status: 'active',
  });

  const plan = pending.billingPlanId;
  const subscriptionEndsAt = computeSubscriptionEnd(plan, now);
  const businessName = pending.businessName || pending.name;
  const slug = await generateUniqueSlug(businessName);

  const provider = await Provider.create({
    userId: user._id,
    name: businessName,
    slug,
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
  await seedDefaultMpesaSettings(provider._id);

  pending.status = 'approved';
  pending.verifiedAt = now;
  pending.approvedAt = now;
  pending.emailVerificationToken = undefined;
  pending.emailVerificationExpiresAt = undefined;
  await pending.save();

  const portalUrl = `https://${slug}.hdm.co.ke`;

  try {
    emailService
      .sendWelcome({
        to: pending.email,
        name: pending.name,
        email: pending.email,
        loginUrl: `${config.providerUrl}/login`,
      })
      .catch((err) =>
        console.error('[authController] welcome email failed:', err.message)
      );

    emailService
      .sendApproved({
        to: provider.email,
        providerName: businessName,
        planName: plan?.name || 'Free Trial',
        periodStart: now.toISOString().slice(0, 10),
        periodEnd: subscriptionEndsAt
          ? subscriptionEndsAt.toISOString().slice(0, 10)
          : 'never',
        dashboardUrl: `${config.providerUrl}/dashboard`,
      })
      .catch((err) =>
        console.error('[authController] approved email failed:', err.message)
      );

    if (provider.phone) {
      smsService
        .sendApproved({
          to: provider.phone,
          planName: plan?.name || 'Free Trial',
        })
        .catch((err) =>
          console.error('[authController] approved sms failed:', err.message)
        );
    }

    notificationService
      .notifyAdmins({
        type: 'provider_verified',
        title: 'Provider account activated',
        body: `${businessName} verified their email and is now active on a 14-day trial. Portal: ${portalUrl}`,
        link: `/providers/${provider._id}`,
        meta: { providerId: provider._id, pendingProviderId: pending._id },
      })
      .catch(() => {});
  } catch (err) {
    console.error('[authController] post-verify dispatch failed:', err.message);
  }

  return success(res, {
    verified: true,
    email: provider.email,
    status: 'active',
    businessName,
    slug,
    portalUrl,
    trialEndsAt: subscriptionEndsAt,
    message: 'Email verified. Your account is active. You can log in now.',
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password required');

  const lower = String(email).toLowerCase();

  const user = await ProviderUser.findOne({ email: lower }).select('+password');

  if (!user) {
    const pending = await PendingProvider.findOne({ email: lower });
    if (pending && pending.status === 'unverified') {
      throw ApiError.forbidden(
        'Please verify your email before logging in.',
        { reason: 'unverified', email: pending.email },
        'EMAIL_UNVERIFIED'
      );
    }
    if (pending && pending.status === 'awaiting_approval') {
      throw ApiError.forbidden(
        'Your account is awaiting admin approval.',
        { reason: 'awaiting_approval' },
        'AWAITING_APPROVAL'
      );
    }
    throw ApiError.unauthorized('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  if (user.status === 'suspended') {
    throw ApiError.forbidden('Account suspended');
  }

  const provider = await Provider.findOne({ userId: user._id });
  if (!provider) throw ApiError.forbidden('Provider account not found');

  await ProviderUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  const payload = {
    sub: String(user._id),
    role: 'provider',
    providerId: String(provider._id),
  };

  return success(res, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: String(user._id), role: 'provider' }),
    provider: buildProviderPayload(provider),
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken required');

  const decoded = verifyRefreshToken(refreshToken);
  const user = await ProviderUser.findById(decoded.sub);
  if (!user || user.status === 'suspended') throw ApiError.unauthorized('Invalid refresh token');

  const provider = await Provider.findOne({ userId: user._id });
  if (!provider) throw ApiError.forbidden('Provider account not found');

  const payload = {
    sub: String(user._id),
    role: 'provider',
    providerId: String(provider._id),
  };

  return success(res, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: String(user._id), role: 'provider' }),
    provider: buildProviderPayload(provider),
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('email required');

  const lower = String(email).toLowerCase();
  const user = await ProviderUser.findOne({ email: lower });
  if (!user) return success(res, { sent: true });

  const token = makeToken();
  user.refreshTokenHash = token;
  await user.save();

  const resetUrl = `${config.providerUrl}/reset-password?token=${token}`;

  try {
    emailService
      .sendPasswordReset({
        to: lower,
        fullName: user.name,
        resetUrl,
        expiresIn: '1 hour',
      })
      .catch((err) =>
        console.error('[authController] password reset email failed:', err.message)
      );
  } catch (err) {
    console.error('[authController] forgot-password dispatch failed:', err.message);
  }

  return success(res, { sent: true });
});

module.exports = { register, verifyEmail, login, refresh, forgotPassword };