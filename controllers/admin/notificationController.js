'use strict';

const notificationService = require('../../services/notificationService');
const { success, paginated } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const result = await notificationService.list(req.user.id, 'admin', {
    unreadOnly: unreadOnly === 'true',
    page: Number(page),
    limit: Number(limit),
  });
  return paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.unreadCount(req.user.id, 'admin');
  return success(res, { count });
});

const markRead = asyncHandler(async (req, res) => {
  const updated = await notificationService.markRead(req.params.id, req.user.id, 'admin');
  return success(res, updated);
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user.id, 'admin');
  return success(res, result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await notificationService.remove(req.params.id, req.user.id, 'admin');
  return success(res, result);
});

module.exports = { list, unreadCount, markRead, markAllRead, remove };