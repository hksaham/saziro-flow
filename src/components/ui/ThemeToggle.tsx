import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
  const { theme, toggleTheme, isFlow } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isFlow ? 'Classic' : 'Flow'} theme`}
      title={`Switch to ${isFlow ? 'Classic dark' : 'Flow light'} theme`}
      className={`
        relative w-10 h-10 rounded-xl flex items-center justify-center
        border border-border bg-secondary
        hover:bg-accent hover:border-primary/40
        transition-all duration-250 group
        ${className}
      `}
    >
      {/* Sun = Flow/light mode */}
      <Sun
        className={`
          w-4.5 h-4.5 absolute transition-all duration-300
          ${isFlow
            ? 'opacity-100 rotate-0 scale-100 text-primary'
            : 'opacity-0 rotate-90 scale-75 text-muted-foreground'
          }
        `}
      />
      {/* Moon = Classic/dark mode */}
      <Moon
        className={`
          w-4.5 h-4.5 absolute transition-all duration-300
          ${!isFlow
            ? 'opacity-100 rotate-0 scale-100 text-primary'
            : 'opacity-0 -rotate-90 scale-75 text-muted-foreground'
          }
        `}
      />
    </button>
  );
};

export default ThemeToggle;
