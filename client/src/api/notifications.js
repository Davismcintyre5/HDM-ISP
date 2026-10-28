import { api, trimParams } from './axios';

export function listNotifications(params) {
  return api.get('/api/client/notifications', { params: trimParams(params) });
}

export function getUnreadCount() {
  return api.get('/api/client/notifications/unread-count');
}

export function markNotificationRead(id) {
  return api.post(`/api/client/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.post('/api/client/notifications/read-all');
}

export function deleteNotification(id) {
  return api.delete(`/api/client/notifications/${id}`);
}