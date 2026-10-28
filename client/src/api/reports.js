import { api, trimParams } from './axios';

export function getRevenueReport(params) {
  return api.get('/api/client/reports/revenue', { params: trimParams(params) });
}

export function getSessionsReport(params) {
  return api.get('/api/client/reports/sessions', { params: trimParams(params) });
}

export function getCustomerCounts() {
  return api.get('/api/client/reports/customers');
}