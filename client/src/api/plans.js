import { api, trimParams } from './axios';

export function listPlans(params) {
  return api.get('/api/client/plans', { params: trimParams(params) });
}

export function getPlan(id) {
  return api.get(`/api/client/plans/${id}`);
}

export function createPlan(payload) {
  return api.post('/api/client/plans', payload);
}

export function updatePlan(id, payload) {
  return api.patch(`/api/client/plans/${id}`, payload);
}

export function archivePlan(id) {
  return api.delete(`/api/client/plans/${id}`);
}