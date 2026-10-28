import { cn } from '../../utils/cn';

export default function EmptyState({ icon, title = 'Nothing here', description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10', className)}>
      {icon && <div className="mb-3 text-slate-400 dark:text-slate-500">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}