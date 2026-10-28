'use strict';

const config = require('../../config/env');
const ApiError = require('../../utils/apiError');

module.exports = (err, req, res, next) => {
  const isApi = err instanceof ApiError;
  const statusCode = isApi ? err.statusCode : 500;
  const message = isApi ? err.message : 'Internal server error';

  if (!isApi) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    success: false,
    message,
    requestId: req.id || null,
  };
  if (isApi && err.code) body.code = err.code;
  if (isApi && err.details) body.details = err.details;

  if (config.nodeEnv === 'development' && !isApi) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};