import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

export default function SearchInput({
  value = '',
  onSearch,
  placeholder = 'Search…',
  debounce = 300,
  className,
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef(null);

  useEffect(() => setLocal(value), [value]);

  function handleChange(v) {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch?.(v), debounce);
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
      <input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocal('');
            onSearch?.('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}