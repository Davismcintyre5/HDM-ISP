import { api } from './axios';

export function getMpesaSettings() {
  return api.get('/api/client/settings/mpesa');
}

export function updateMpesaSettings(payload) {
  return api.put('/api/client/settings/mpesa', payload);
}

export function testMpesaSettings() {
  return api.post('/api/client/settings/mpesa/test');
}