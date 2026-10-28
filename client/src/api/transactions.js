import { api, trimParams } from './axios';

export function listTransactions(params) {
  return api.get('/api/client/transactions', { params: trimParams(params) });
}

export function getTransaction(id) {
  return api.get(`/api/client/transactions/${id}`);
}

export function getTransactionSummary() {
  return api.get('/api/client/transactions/summary');
}