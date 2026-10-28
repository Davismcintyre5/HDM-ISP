import { useState } from 'react';
import Button from '../ui/Button';
import LegalModal from './LegalModal';
import { KEYS, storage } from '../../utils/storage';

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => !storage.get(KEYS.COOKIE));
  const [legalOpen, setLegalOpen] = useState(false);

  function choose(value) {
    storage.set(KEYS.COOKIE, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-4"
      >
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">We use cookies</div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          We use browser storage to keep you signed in and remember your preferences.{' '}
          <button
            onClick={() => setLegalOpen(true)}
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Learn more
          </button>
        </p>
        <div className="mt-3 flex items-center gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => choose('declined')}>
            Decline
          </Button>
          <Button size="sm" onClick={() => choose('accepted')}>
            Accept
          </Button>
        </div>
      </div>
      <LegalModal open={legalOpen} variant="cookies" onClose={() => setLegalOpen(false)} />
    </>
  );
}