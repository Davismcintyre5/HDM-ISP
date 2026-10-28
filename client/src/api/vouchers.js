import { api, trimParams } from './axios';

export function listVouchers(params) {
  return api.get('/api/client/vouchers', { params: trimParams(params) });
}

export function generateVouchers(payload) {
  return api.post('/api/client/vouchers/generate', payload);
}

export function revokeVoucher(code) {
  return api.post(`/api/client/vouchers/${code}/revoke`);
}