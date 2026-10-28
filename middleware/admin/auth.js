'use strict';

const ApiError = require('../../utils/apiError');
const { verifyAccessToken } = require('../../utils/jwt');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing bearer token'));
  }

  const token = header.slice(7);
  const decoded = verifyAccessToken(token);

  if (decoded.role !== 'admin') {
    return next(ApiError.forbidden('Admin token required'));
  }

  req.user = {
    id: decoded.sub,
    role: 'admin',
    adminRole: decoded.adminRole || 'support',
  };
  next();
};