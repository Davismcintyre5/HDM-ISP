import { cn } from '../../utils/cn';

export default function Select({ label, error, hint, required, id, className, children, ...rest }) {
  const inputId = id || `sel-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={inputId}
        required={required}
        className={cn(
          'w-full h-10 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 transition',
          'border-slate-300 dark:border-slate-700',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          error && 'border-red-500 dark:border-red-500',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}