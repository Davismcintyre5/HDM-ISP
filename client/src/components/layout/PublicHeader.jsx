import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import { useSite } from '../../context/SiteContext';
import { cn } from '../../utils/cn';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/faqs', label: 'FAQs' },
  { to: '/help', label: 'Help' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { siteSettings } = useSite();

  const registrationOpen = siteSettings?.registration_open !== false;

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Logo href="/" size="md" />

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition',
                  isActive
                    ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-slate-800'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="hidden sm:block">
            <Button variant="secondary" size="sm">Sign in</Button>
          </Link>
          {registrationOpen && (
            <Link to="/register" className="hidden sm:block">
              <Button size="sm">Get started</Button>
            </Link>
          )}
          <IconButton
            ariaLabel="Menu"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            icon={open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          />
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium',
                    isActive
                      ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-slate-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Link to="/login" className="flex-1">
                <Button variant="secondary" size="sm" fullWidth>Sign in</Button>
              </Link>
              {registrationOpen && (
                <Link to="/register" className="flex-1">
                  <Button size="sm" fullWidth>Get started</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}