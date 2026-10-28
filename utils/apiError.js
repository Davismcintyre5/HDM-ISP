'use strict';

class ApiError extends Error {
  constructor(statusCode, message, details = null, code = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details, 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, null, 'UNAUTHORIZED');
  }

  static paymentRequired(message = 'Payment required', details = null) {
    return new ApiError(402, message, details, 'PAYMENT_REQUIRED');
  }

  static forbidden(message = 'Forbidden', details = null, code = 'FORBIDDEN') {
    return new ApiError(403, message, details, code);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message, null, 'NOT_FOUND');
  }

  static conflict(message, details) {
    return new ApiError(409, message, details, 'CONFLICT');
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message, null, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, null, 'INTERNAL_ERROR');
  }

  static badGateway(message = 'Upstream service error', details) {
    return new ApiError(502, message, details, 'BAD_GATEWAY');
  }
}

module.exports = ApiError;