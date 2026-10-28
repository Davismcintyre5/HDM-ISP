import { useEffect } from 'react';
import { KEYS, storage } from '../utils/storage';

const STATIC = '/manifest.webmanifest';

function buildUrl() {
  const token = storage.get(KEYS.ACCESS);
  const valid = typeof token === 'string' && token.length > 20;
  return valid
    ? `/api/client/manifest?token=${encodeURIComponent(token)}`
    : STATIC;
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
      if (link.getAttribute('href') !== next) link.setAttribute('href', next);
    }

    sync();
    const id = setInterval(sync, 5000);
    window.addEventListener('storage', sync);

    return () => {
      clearInterval(id);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return null;
}