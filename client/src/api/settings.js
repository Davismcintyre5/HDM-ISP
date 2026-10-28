import { api } from './axios';

export function getSettings() {
  return api.get('/api/client/settings');
}

export function updateSetting(key, value) {
  return api.patch(`/api/client/settings/${encodeURIComponent(key)}`, { value });
}

export function bulkUpdateSettings(settings) {
  return api.post('/api/client/settings/bulk', { settings });
}