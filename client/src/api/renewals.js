import { api } from './axios';

export function renewCustomer(payload) {
  return api.post('/api/client/renewals', payload);
}

export function bulkRenewCustomers(payload) {
  return api.post('/api/client/renewals/bulk', payload);
}