import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Router,
  Users,
  Ticket,
  Receipt,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import Drawer from '../ui/Drawer';
import Logo from '../ui/Logo';
import { useSite } from '../../context/SiteContext';
import { cn } from '../../utils/cn';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/plans', label: 'Plans', icon: Package },
  { to: '/routers', label: 'Routers', icon: Router },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/vouchers', label: 'Vouchers', icon: Ticket },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
  const { mobileNavOpen, closeMobileNav, unreadCount } = useSite();
  const location = useLocation();

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname]);

  return (
    <Drawer
      open={mobileNavOpen}
      onClose={closeMobileNav}
      side="left"
      width="w-64"
      title={<Logo showWordmark size="sm" />}
    >
      <nav className="p-2 space-y-1">
        {NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={closeMobileNav}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold grid place-items-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </Drawer>
  );
}