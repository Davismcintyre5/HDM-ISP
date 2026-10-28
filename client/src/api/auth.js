import { api } from './axios';

export function login(email, password) {
  return api.post('/api/public/auth/provider/login', { email, password });
}

export function register(payload) {
  return api.post('/api/public/auth/provider/register', payload);
}

export function verifyEmail(token) {
  return api.get('/api/public/auth/provider/verify-email', { params: { token } });
}

export function forgotPassword(email) {
  return api.post('/api/public/auth/provider/forgot-password', { email });
}

export function resetPassword(token, password) {
  return api.post('/api/public/auth/provider/reset-password', { token, password });
}

export function resendVerification(email) {
  return api.post('/api/public/auth/provider/resend-verification', { email });
}

export function refresh(refreshToken) {
  return api.post('/api/public/auth/provider/refresh', { refreshToken });
}