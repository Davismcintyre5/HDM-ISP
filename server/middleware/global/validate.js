'use strict';

const ApiError = require('../../utils/apiError');

module.exports = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }

  req[source] = value;
  next();
};