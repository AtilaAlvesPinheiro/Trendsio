import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Carregar tema salvo ou usar sistema
    const saved = localStorage.getItem('theme') as Theme | null;
    const initial = saved || 'system';
    setThemeState(initial);

    // Detectar preferência do sistema
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = initial === 'system' ? isDarkMode : initial === 'dark';
    
    setIsDark(shouldBeDark);
    updateDOM(shouldBeDark);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = newTheme === 'system' ? isDarkMode : newTheme === 'dark';
    
    setIsDark(shouldBeDark);
    updateDOM(shouldBeDark);
  };

  const updateDOM = (isDarkMode: boolean) => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
