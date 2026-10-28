import { cn } from '../../utils/cn';

export default function Skeleton({ variant = 'rect', width, height, className }) {
  const base = 'animate-pulse bg-slate-200 dark:bg-slate-800';
  const shape =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded h-4' : 'rounded-md';
  return (
    <div
      className={cn(base, shape, className)}
      style={{ width, height }}
    />
  );
}