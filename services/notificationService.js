'use strict';

const InAppNotification = require('../models/admin/InAppNotification');
const ApiError = require('../utils/apiError');

// ─────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────

async function create({
  recipientId,
  recipientType,
  type,
  title,
  body = '',
  link = null,
  meta = null,
}) {
  if (!recipientId || !recipientType || !type || !title) {
    throw ApiError.badRequest(
      'recipientId, recipientType, type, and title are required'
    );
  }
  if (!['admin', 'provider'].includes(recipientType)) {
    throw ApiError.badRequest('recipientType must be "admin" or "provider"');
  }

  return InAppNotification.create({
    recipientId,
    recipientType,
    type,
    title,
    body,
    link,
    meta,
  });
}

async function createMany(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return InAppNotification.insertMany(items);
}

async function notifyAdmins(payload = {}) {
  const Admin = require('../models/admin/Admin');
  const admins = await Admin.find({ status: 'active' }, '_id').lean();
  if (!admins.length) return [];
  return createMany(
    admins.map((a) => ({
      ...payload,
      recipientId: a._id,
      recipientType: 'admin',
    }))
  );
}

async function notifyProvider(providerUserId, payload = {}) {
  return create({
    ...payload,
    recipientId: providerUserId,
    recipientType: 'provider',
  });
}

// ─────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────

async function list(
  recipientId,
  recipientType,
  { unreadOnly = false, page = 1, limit = 20 } = {}
) {
  const filter = { recipientId, recipientType };
  if (unreadOnly) filter.read = false;

  const skip = (Math.max(1, page) - 1) * limit;

  const [items, total] = await Promise.all([
    InAppNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InAppNotification.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

async function unreadCount(recipientId, recipientType) {
  return InAppNotification.countDocuments({
    recipientId,
    recipientType,
    read: false,
  });
}

// ─────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────

async function markRead(notificationId, recipientId, recipientType) {
  const updated = await InAppNotification.findOneAndUpdate(
    { _id: notificationId, recipientId, recipientType },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
  if (!updated) throw ApiError.notFound('Notification not found');
  return updated;
}

async function markAllRead(recipientId, recipientType) {
  const result = await InAppNotification.updateMany(
    { recipientId, recipientType, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  return { modified: result.modifiedCount };
}

async function remove(notificationId, recipientId, recipientType) {
  const result = await InAppNotification.findOneAndDelete({
    _id: notificationId,
    recipientId,
    recipientType,
  });
  if (!result) throw ApiError.notFound('Notification not found');
  return { deleted: true };
}

module.exports = {
  create,
  createMany,
  notifyAdmins,
  notifyProvider,
  list,
  unreadCount,
  markRead,
  markAllRead,
  remove,
};