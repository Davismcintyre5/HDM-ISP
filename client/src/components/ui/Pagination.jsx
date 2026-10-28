import Button from './Button';
import { cn } from '../../utils/cn';

const PAGE_SIZES = [10, 20, 50, 100];

function buildPages(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const withEllipsis = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withEllipsis.push('…');
    withEllipsis.push(p);
  });
  return withEllipsis;
}

export default function Pagination({
  page = 1,
  limit = 20,
  total = 0,
  onPageChange,
  onLimitChange,
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3', className)}>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{start}</span>–
        <span className="font-medium text-slate-700 dark:text-slate-200">{end}</span> of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-700 dark:text-slate-200"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          Prev
        </Button>
        <div className="hidden sm:flex items-center gap-1">
          {buildPages(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-2 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={cn(
                  'h-8 min-w-8 px-2 rounded-md text-xs font-medium transition',
                  p === page
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {p}
              </button>
            )
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}