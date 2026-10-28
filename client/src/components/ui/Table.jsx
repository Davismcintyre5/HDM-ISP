import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { cn } from '../../utils/cn';

export default function Table({
  columns = [],
  rows = [],
  getRowId,
  loading = false,
  empty,
  onRowClick,
  className,
}) {
  const colCount = columns.length;

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800', className)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/60 text-left">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center'
                )}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {loading && (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton variant="text" />
                  </td>
                ))}
              </tr>
            ))
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-12">
                {empty || <EmptyState title="No records" />}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row, idx) => {
              const id = getRowId ? getRowId(row) : row._id || idx;
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 text-slate-700 dark:text-slate-200',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center'
                      )}
                    >
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}