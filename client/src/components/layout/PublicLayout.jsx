import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import CookieConsent from '../public/CookieConsent';
import { useSite } from '../../context/SiteContext';

export default function PublicLayout() {
  const { siteSettings } = useSite();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {siteSettings?.maintenance_mode && (
        <div className="bg-amber-500 text-amber-950 text-sm px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          We're performing scheduled maintenance. Some features may be briefly unavailable.
        </div>
      )}
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <CookieConsent />
    </div>
  );
}