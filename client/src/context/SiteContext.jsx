import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getUnreadCount } from '../api/notifications';
import { getSiteSettings } from '../api/site';
import { useAuth } from './AuthContext';
import { KEYS, storage } from '../utils/storage';

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => storage.get(KEYS.SIDEBAR) === '1');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [siteSettings, setSiteSettings] = useState(null);
  const [siteSettingsLoading, setSiteSettingsLoading] = useState(true);

  useEffect(() => {
    storage.set(KEYS.SIDEBAR, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    let cancelled = false;
    setSiteSettingsLoading(true);
    getSiteSettings()
      .then(({ data }) => {
        if (!cancelled) setSiteSettings(data.data);
      })
      .catch(() => {
        if (!cancelled) setSiteSettings(null);
      })
      .finally(() => {
        if (!cancelled) setSiteSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    async function fetchCount() {
      try {
        const { data } = await getUnreadCount();
        if (!cancelled) setUnreadCount(data.data.count);
      } catch {}
    }
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated]);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);
  const openMobileNav = () => setMobileNavOpen(true);
  const closeMobileNav = () => setMobileNavOpen(false);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await getUnreadCount();
      setUnreadCount(data.data.count);
    } catch {}
  }, []);

  const refreshSiteSettings = useCallback(async () => {
    setSiteSettingsLoading(true);
    try {
      const { data } = await getSiteSettings();
      setSiteSettings(data.data);
    } catch {
    } finally {
      setSiteSettingsLoading(false);
    }
  }, []);

  return (
    <SiteContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        mobileNavOpen,
        openMobileNav,
        closeMobileNav,
        unreadCount,
        setUnreadCount,
        refreshUnread,
        siteSettings,
        siteSettingsLoading,
        refreshSiteSettings,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}