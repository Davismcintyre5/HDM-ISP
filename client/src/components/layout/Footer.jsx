export default function Footer() {
  return (
    <footer className="px-4 md:px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>© {new Date().getFullYear()} HDM Technologies · Provider Console</span>
      <span>v1.0.0</span>
    </footer>
  );
}