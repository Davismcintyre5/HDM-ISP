'use strict';

const ApiError = require('../../utils/apiError');
const config = require('../../config/env');
const { verifyAccessToken } = require('../../utils/jwt');
const Provider = require('../../models/admin/Provider');
const ProviderUser = require('../../models/provider/User');

const PUBLIC_PATHS = ['/billing', '/profile'];

function isPublicPath(req) {
  const original = req.originalUrl || '';
  const afterApiClient = original.replace(/^\/api\/client/, '');
  return PUBLIC_PATHS.some(
    (p) => afterApiClient === p || afterApiClient.startsWith(p + '/')
  );
}

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Missing bearer token'));
    }

    const token = header.slice(7);
    const decoded = verifyAccessToken(token);

    if (decoded.role !== 'provider' || !decoded.providerId) {
      return next(ApiError.forbidden('Provider token required'));
    }

    const user = await ProviderUser.findById(decoded.sub).lean();
    if (!user || user.status === 'suspended') {
      return next(ApiError.forbidden('Account suspended'));
    }

    const provider = await Provider.findById(decoded.providerId).lean();
    if (!provider) {
      return next(ApiError.forbidden('Provider not found'));
    }

    req.user = {
      id: decoded.sub,
      providerId: decoded.providerId,
      role: 'provider',
    };
    req.provider = provider;

    if (provider.status === 'suspended' && !isPublicPath(req)) {
      return next(
        ApiError.paymentRequired(
          'Payment required. Renew your plan to restore access.',
          {
            reason: 'suspended',
            billingStatus: provider.billingStatus,
            subscriptionEndsAt: provider.subscriptionEndsAt,
            renewUrl: `${config.providerUrl}/billing`,
          }
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};