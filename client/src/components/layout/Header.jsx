import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, PanelLeft, Settings, User } from 'lucide-react';
import IconButton from '../ui/IconButton';
import ThemeToggle from '../ui/ThemeToggle';
import Avatar from '../ui/Avatar';
import Dropdown, { DropdownItem } from '../ui/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar, openMobileNav, unreadCount, sidebarCollapsed, siteSettings } = useSite();
  const navigate = useNavigate();

  const appName = siteSettings?.['branding.appName'] || 'HDM';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-2 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 min-w-0">
        <IconButton
          ariaLabel="Open menu"
          className="md:hidden"
          onClick={openMobileNav}
          icon={<Menu className="h-5 w-5" />}
        />
        <IconButton
          ariaLabel="Toggle sidebar"
          className="hidden md:inline-flex"
          onClick={toggleSidebar}
          icon={<PanelLeft className="h-5 w-5" />}
        />
        {sidebarCollapsed && (
          <span className="hidden md:inline-block text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-48">
            {appName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Link to="/notifications" className="relative">
          <IconButton ariaLabel="Notifications" icon={<Bell className="h-5 w-5" />} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold grid place-items-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <ThemeToggle />
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar name={user?.name || 'P'} size="sm" />
              <span className="hidden md:block text-sm text-slate-700 dark:text-slate-200 max-w-32 truncate">
                {user?.name || 'Provider'}
              </span>
            </button>
          }
        >
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {user?.name || 'Provider'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || ''}
            </div>
          </div>
          <DropdownItem icon={<User className="h-4 w-4" />} onClick={() => navigate('/profile')}>
            Profile
          </DropdownItem>
          <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => navigate('/settings')}>
            Settings
          </DropdownItem>
          <DropdownItem icon={<LogOut className="h-4 w-4" />} danger onClick={handleLogout}>
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}