import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SiteProvider } from './context/SiteContext';
import ManifestLink from './components/ManifestLink';
import { usePageTitle } from './hooks/usePageTitle';
import AppRoutes from './routes/AppRoutes';

function PageTitle() {
  usePageTitle();
  return null;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SiteProvider>
              <PageTitle />
              <ManifestLink />
              <AppRoutes />
            </SiteProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}