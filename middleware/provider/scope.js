'use strict';

const ApiError = require('../../utils/apiError');

module.exports = (req, res, next) => {
  const bodyProvider = req.body?.providerId;
  const queryProvider = req.query?.providerId;

  if (
    (bodyProvider && bodyProvider !== req.user.providerId) ||
    (queryProvider && queryProvider !== req.user.providerId)
  ) {
    return next(ApiError.forbidden('Provider scope violation'));
  }

  req.providerId = req.user.providerId;
  next();
};