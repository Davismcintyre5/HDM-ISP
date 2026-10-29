import axios from 'axios';
import { KEYS, storage } from '../utils/storage';

export const api = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const PUBLIC_AUTH_PATHS = [
  '/api/public/auth/provider/login',
  '/api/public/auth/provider/register',
  '/api/public/auth/provider/verify-email',
  '/api/public/auth/provider/refresh',
];

function isPublicAuth(url) {
  return PUBLIC_AUTH_PATHS.some((p) => url?.includes(p));
}

function notifyTokenChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hdm:token-change'));
  }
}

api.interceptors.request.use((config) => {
  const token = storage.get(KEYS.ACCESS);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshingPromise = null;

async function performRefresh() {
  const refreshToken = storage.get(KEYS.REFRESH);
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post(
    '/api/public/auth/provider/refresh',
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const accessToken = data?.data?.accessToken;
  const newRefresh = data?.data?.refreshToken;
  if (!accessToken) throw new Error('Refresh failed');

  storage.set(KEYS.ACCESS, accessToken);
  if (newRefresh) storage.set(KEYS.REFRESH, newRefresh);
  notifyTokenChange();
  return accessToken;
}

function isOnBillingOrProfile() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return (
    path === '/billing' ||
    path.startsWith('/billing/') ||
    path === '/profile'
  );
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 402 && !original?._paymentRedirect) {
      original._paymentRedirect = true;
      const data = error.response?.data || {};
      const renewUrl = data?.details?.renewUrl || data?.renewUrl || '/billing';

      try {
        sessionStorage.setItem(
          'hdm_payment_required',
          JSON.stringify({
            at: Date.now(),
            message: data?.message || 'Payment required.',
            details: data?.details || null,
          })
        );
      } catch {}

      if (!isOnBillingOrProfile()) {
        const target =
          typeof renewUrl === 'string' && renewUrl.startsWith('/')
            ? renewUrl
            : '/billing';
        window.location.assign(target);
      }

      return Promise.reject(error);
    }

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      isPublicAuth(original.url)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshingPromise = refreshingPromise || performRefresh();
      const token = await refreshingPromise;
      refreshingPromise = null;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (e) {
      refreshingPromise = null;
      storage.clearProviderSession();
      notifyTokenChange();
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.assign('/login');
      }
      return Promise.reject(e);
    }
  }
);

function trimParams(params) {
  if (!params) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export { trimParams, notifyTokenChange };