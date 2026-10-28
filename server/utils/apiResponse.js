'use strict';

function success(res, data = null, message = 'OK', statusCode = 200, meta = null) {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function paginated(res, data, { page, limit, total }, message = 'OK') {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

function error(res, message, statusCode = 500, details = null, code = null) {
  const body = { success: false, message };
  if (code) body.code = code;
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, created, noContent, paginated, error };