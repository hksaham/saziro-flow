import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'flow' | 'classic';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isFlow: boolean;    // light cyan mode
  isClassic: boolean; // dark emerald mode
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'saziro-theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'flow' || stored === 'classic') return stored;
    // Default to classic (dark) — safer for a student app
    return 'classic';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'flow') {
      root.classList.add('flow');
      root.classList.remove('classic');
    } else {
      root.classList.add('classic');
      root.classList.remove('flow');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'flow' ? 'classic' : 'flow');
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isFlow: theme === 'flow',
      isClassic: theme === 'classic',
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
