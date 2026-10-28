'use strict';

const Customer = require('../../models/provider/Customer');
const Router = require('../../models/provider/Router');
const Voucher = require('../../models/provider/Voucher');
const Transaction = require('../../models/admin/Transaction');
const Session = require('../../models/admin/Session');
const Provider = require('../../models/admin/Provider');
const { success } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/apiError');

const summary = asyncHandler(async (req, res) => {
  const providerId = req.user.providerId;
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    provider,
    totalCustomers,
    activeCustomers,
    totalRouters,
    onlineRouters,
    unusedVouchers,
    completedToday,
    revenueToday,
    activeSessions,
  ] = await Promise.all([
    Provider.findById(providerId).populate('billingPlanId', 'name billingCycle trialDays price currency').lean(),
    Customer.countDocuments({ providerId }),
    Customer.countDocuments({ providerId, status: 'active' }),
    Router.countDocuments({ providerId }),
    Router.countDocuments({ providerId, status: 'online' }),
    Voucher.countDocuments({ providerId, status: 'unused', expiresAt: { $gt: now } }),
    Transaction.countDocuments({ providerId, status: 'completed', createdAt: { $gte: dayAgo } }),
    Transaction.aggregate([
      { $match: { providerId: providerId, status: 'completed', createdAt: { $gte: dayAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Session.countDocuments({ providerId, stopTime: null }),
  ]);

  return success(res, {
    provider: {
      id: provider._id,
      name: provider.name,
      status: provider.status,
      billingStatus: provider.billingStatus,
      billingPlan: provider.billingPlanId,
      subscriptionEndsAt: provider.subscriptionEndsAt,
    },
    customers: { total: totalCustomers, active: activeCustomers },
    routers: { total: totalRouters, online: onlineRouters },
    vouchers: { unused: unusedVouchers },
    today: {
      completedTransactions: completedToday,
      revenue: revenueToday[0]?.total || 0,
    },
    sessions: { active: activeSessions },
  });
});

module.exports = { summary };