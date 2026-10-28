'use strict';

const config = require('../../config/env');
const ApiError = require('../../utils/apiError');

module.exports = (req, res, next) => {
  const provided =
    req.headers['x-radius-secret'] ||
    req.body?.secret ||
    req.query?.secret;

  if (!provided || provided !== config.radius.sharedSecret) {
    return next(ApiError.unauthorized('Invalid RADIUS shared secret'));
  }
  next();
};