import { cn } from '../../utils/cn';

export default function Checkbox({ label, checked, onChange, disabled, className, ...rest }) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-900"
        {...rest}
      />
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  );
}