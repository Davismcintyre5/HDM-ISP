'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('./apiError');

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpires,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}

function decodeToken(token) {
  return jwt.decode(token, { complete: true });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};