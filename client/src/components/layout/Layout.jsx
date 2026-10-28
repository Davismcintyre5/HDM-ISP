import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import ToastHost from '../ui/ToastHost';
import CookieConsent from '../public/CookieConsent';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { booting } = useAuth();

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
      <MobileNav />
      <ToastHost />
      <CookieConsent />
    </div>
  );
}