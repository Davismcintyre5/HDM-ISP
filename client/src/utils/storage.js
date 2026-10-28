export const KEYS = {
  THEME: 'hdm-theme',
  ACCESS: 'provider_access',
  REFRESH: 'provider_refresh',
  SIDEBAR: 'hdm-sidebar-collapsed',
  COOKIE: 'hdm-cookie-consent',
};

export const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    } catch { return null; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
  clearProviderSession() {
    this.remove(KEYS.ACCESS);
    this.remove(KEYS.REFRESH);
  },
};