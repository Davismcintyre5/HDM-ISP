import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import { cn } from '../../utils/cn';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  size = 'md',
  dismissible = true,
  footer,
  children,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const target = document.getElementById('overlay-root') || document.body;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70"
        onClick={() => dismissible && onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl',
          SIZES[size]
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-2 px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {dismissible && (
              <IconButton
                ariaLabel="Close"
                icon={<X className="h-4 w-4" />}
                onClick={onClose}
              />
            )}
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto text-slate-700 dark:text-slate-200">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    target
  );
}