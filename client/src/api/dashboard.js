import { api } from './axios';

export function getDashboardSummary() {
  return api.get('/api/client/dashboard/summary');
}