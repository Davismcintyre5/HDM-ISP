import { cn } from '../../utils/cn';

export default function IconButton({
  icon,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  className,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50';
  const variants = {
    ghost:
      'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200',
    solid:
      'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100',
  };
  const sizes = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {icon}
    </button>
  );
}