import { Link, Outlet } from 'react-router-dom';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="flex items-center justify-between px-4 h-14">
        <Logo href="/" />
        <ThemeToggle />
      </header>
      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pb-4">
        © {new Date().getFullYear()} HDM Technologies ·{' '}
        <Link to="/" className="hover:text-slate-900 dark:hover:text-slate-100">
          Back to site
        </Link>
      </footer>
    </div>
  );
}