import { api, trimParams } from './axios';

export function listCustomers(params) {
  return api.get('/api/client/customers', { params: trimParams(params) });
}

export function getCustomer(id) {
  return api.get(`/api/client/customers/${id}`);
}

export function createCustomer(payload) {
  return api.post('/api/client/customers', payload);
}

export function suspendCustomer(id) {
  return api.post(`/api/client/customers/${id}/suspend`);
}

export function activateCustomer(id) {
  return api.post(`/api/client/customers/${id}/activate`);
}

export function deleteCustomer(id) {
  return api.delete(`/api/client/customers/${id}`);
}