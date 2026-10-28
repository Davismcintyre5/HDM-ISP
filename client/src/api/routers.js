import { api, trimParams } from './axios';

const LONG_TIMEOUT = { timeout: 30000 };

export function listRouters(params) {
  return api.get('/api/client/routers', { params: trimParams(params) });
}

export function createRouter(payload) {
  return api.post('/api/client/routers', payload);
}

export function updateRouter(id, payload) {
  return api.patch(`/api/client/routers/${id}`, payload);
}

export function deleteRouter(id) {
  return api.delete(`/api/client/routers/${id}`);
}

export function testRouter(id) {
  return api.post(`/api/client/routers/${id}/test`, null, LONG_TIMEOUT);
}

export function getRouterSessions(id) {
  return api.get(`/api/client/routers/${id}/sessions`, LONG_TIMEOUT);
}