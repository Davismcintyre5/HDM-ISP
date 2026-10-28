import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import { cn } from '../../utils/cn';

export default function Drawer({ open, onClose, side = 'right', width = 'w-80', title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const target = document.getElementById('overlay-root') || document.body;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/70" onClick={onClose} />
      <div
        className={cn(
          'absolute top-0 bottom-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl flex flex-col',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          width
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <IconButton ariaLabel="Close" icon={<X className="h-4 w-4" />} onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    target
  );
}