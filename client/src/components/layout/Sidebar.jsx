import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Router,
  Users,
  Ticket,
  Receipt,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
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
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, unreadCount } = useSite();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
        <Logo showWordmark={!sidebarCollapsed} size="sm" />
      </div>
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                sidebarCollapsed && 'justify-center px-2',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="flex-1 truncate">{label}</span>}
            {!sidebarCollapsed && badge && unreadCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold grid place-items-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        {!sidebarCollapsed && <>© {new Date().getFullYear()} HDM</>}
      </div>
    </aside>
  );
}