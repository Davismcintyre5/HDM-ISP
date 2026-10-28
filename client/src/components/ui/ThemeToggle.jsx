import { Sun, Moon } from 'lucide-react';
import IconButton from './IconButton';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
      ariaLabel={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      className={className}
    />
  );
}