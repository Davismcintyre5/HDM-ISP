import { api } from './axios';

const BASE = '/api/public/site';

export function getSiteSettings() {
  return api.get(`${BASE}/settings`);
}

export function getSitePlans(params) {
  return api.get(`${BASE}/plans`, { params });
}

export function getPaymentMethods() {
  return api.get(`${BASE}/payment-methods`);
}

export function getLegalByType(type) {
  return api.get(`${BASE}/legal/${type}`);
}

export function getLegalList() {
  return api.get(`${BASE}/legal`);
}