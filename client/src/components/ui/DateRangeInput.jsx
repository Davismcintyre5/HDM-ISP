import { cn } from '../../utils/cn';

export default function DateRangeInput({ from, to, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="date"
        value={from || ''}
        onChange={(e) => onChange?.({ from: e.target.value, to })}
        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <span className="text-slate-400 dark:text-slate-500 text-sm">to</span>
      <input
        type="date"
        value={to || ''}
        onChange={(e) => onChange?.({ from, to: e.target.value })}
        className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}