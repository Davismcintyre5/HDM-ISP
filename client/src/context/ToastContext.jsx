import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id =
      (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
      String(Date.now() + Math.random());
    const entry = { id, type: 'info', duration: 4000, ...toast };
    setToasts((t) => [...t, entry]);
    if (entry.duration > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, entry.duration);
    }
    return id;
  }, []);

  const toast = {
    success: (title, opts) => pushToast({ type: 'success', title, ...opts }),
    error: (title, opts) => pushToast({ type: 'error', title, ...opts }),
    info: (title, opts) => pushToast({ type: 'info', title, ...opts }),
    warning: (title, opts) => pushToast({ type: 'warning', title, ...opts }),
    dismiss: dismissToast,
    push: pushToast,
  };

  return (
    <ToastContext.Provider value={{ toasts, pushToast, dismissToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}