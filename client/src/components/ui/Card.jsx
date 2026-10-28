import { cn } from '../../utils/cn';

const PADDING = { none: '', sm: 'p-3', md: 'p-4 md:p-5', lg: 'p-6 md:p-8' };

export default function Card({ header, footer, padding = 'md', className, children }) {
  return (
    <div className={cn('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm', className)}>
      {header && <div className="px-4 md:px-5 pt-4 md:pt-5 pb-2 border-b border-slate-200 dark:border-slate-800">{header}</div>}
      <div className={cn(PADDING[padding], header && 'pt-3')}>{children}</div>
      {footer && <div className="px-4 md:px-5 py-3 border-t border-slate-200 dark:border-slate-800">{footer}</div>}
    </div>
  );
}