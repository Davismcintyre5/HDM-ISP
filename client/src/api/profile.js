import { api } from './axios';

export function getProfile() {
  return api.get('/api/client/profile');
}

export function updateProfile(payload) {
  return api.patch('/api/client/profile', payload);
}

export function changePassword(currentPassword, newPassword) {
  return api.post('/api/client/profile/change-password', { currentPassword, newPassword });
}

export function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return api.post('/api/client/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}