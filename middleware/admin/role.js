'use strict';

const ApiError = require('../../utils/apiError');

module.exports = (...allowed) => (req, res, next) => {
  const role = req.user?.adminRole;
  if (!role || !allowed.includes(role)) {
    return next(ApiError.forbidden('Insufficient admin role'));
  }
  next();
};