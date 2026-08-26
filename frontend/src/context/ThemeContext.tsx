import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: 'dark' | 'light';
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('criterium_theme_mode');
    return (saved as ThemeMode) || 'dark';
  });

  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');

  const setThemeMode = (mode: ThemeMode) => {
    localStorage.setItem('criterium_theme_mode', mode);
    setThemeModeState(mode);
  };

  useEffect(() => {
    const updateTheme = () => {
      let resolved: 'dark' | 'light' = 'dark';

      if (themeMode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = prefersDark ? 'dark' : 'light';
      } else {
        resolved = themeMode;
      }

      setActiveTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
    };

    updateTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setActiveTheme(e.matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, activeTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
