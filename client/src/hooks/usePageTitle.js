import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  public: 'HDM ISP',
  app: 'HDM Provider Console',
};

const PUBLIC_ROUTES = ['/', '/faqs', '/help', '/contact'];

function resolveTitle(pathname) {
  if (PUBLIC_ROUTES.includes(pathname)) return TITLES.public;
  return TITLES.app;
}

export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = resolveTitle(pathname);
  }, [pathname]);
}