import { cn } from '../../utils/cn';

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name = '', src, size = 'md', className }) {
  return (
    <div
      className={cn(
        'rounded-full grid place-items-center font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 overflow-hidden',
        SIZES[size],
        className
      )}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name) || '?'}
    </div>
  );
}