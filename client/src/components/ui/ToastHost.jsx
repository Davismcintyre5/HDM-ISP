import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
  info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
};

export default function ToastHost() {
  const { toasts, dismissToast } = useToast();
  const target = document.getElementById('overlay-root') || document.body;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border shadow-lg bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-800'
          )}
        >
          <div className="mt-0.5">{ICONS[t.type] || ICONS.info}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</div>
            {t.message && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.message}</div>}
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    target
  );
}