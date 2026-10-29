import { useEffect } from 'react';
import { KEYS, storage } from '../utils/storage';
import { api } from '../api/axios';

const STATIC = '/manifest.webmanifest';

function buildUrl() {
  const token = storage.get(KEYS.ACCESS);
  const valid = typeof token === 'string' && token.length > 20;
  if (!valid) return STATIC;

  const base = (api.defaults.baseURL || '').replace(/\/+$/, '');
  return `${base}/api/client/manifest?token=${encodeURIComponent(token)}`;
}

export default function ManifestLink() {
  useEffect(() => {
    function sync() {
      let link = document.querySelector('link[rel="manifest"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      const next = buildUrl();
      if (link.getAttribute('href') !== next) {
        link.setAttribute('href', next);
      }
    }

    sync();

    window.addEventListener('hdm:token-change', sync);
    window.addEventListener('storage', sync);
    const id = setInterval(sync, 5000);

    return () => {
      window.removeEventListener('hdm:token-change', sync);
      window.removeEventListener('storage', sync);
      clearInterval(id);
    };
  }, []);

  return null;
}