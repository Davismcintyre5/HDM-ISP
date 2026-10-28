import { cn } from '../../utils/cn';

export default function Input({
  label,
  error,
  hint,
  required,
  id,
  className,
  leadingIcon,
  ...rest
}) {
  const inputId = id || `in-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          required={required}
          className={cn(
            'w-full h-10 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition',
            'border-slate-300 dark:border-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            error && 'border-red-500 dark:border-red-500 focus:ring-red-500',
            leadingIcon && 'pl-9',
            'px-3',
            className
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}