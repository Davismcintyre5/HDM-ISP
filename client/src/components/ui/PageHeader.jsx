import { cn } from '../../utils/cn';

export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5', className)}>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}