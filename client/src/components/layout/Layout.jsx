import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import ToastHost from '../ui/ToastHost';
import CookieConsent from '../public/CookieConsent';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { cn } from '../../utils/cn';

export default function Layout() {
  const { booting } = useAuth();
  const { sidebarCollapsed } = useSite();

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className={cn('flex-1 flex flex-col min-w-0', 'transition-all')}>
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
      <MobileNav />
      <ToastHost />
      <CookieConsent />
    </div>
  );
}