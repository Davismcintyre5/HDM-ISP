import { cn } from '../../utils/cn';

export default function Tabs({ tabs = [], active, onChange, className }) {
  return (
    <div className={cn('border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto', className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition',
              isActive
                ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}