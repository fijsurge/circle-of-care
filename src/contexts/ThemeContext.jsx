import { createContext, useContext, useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, userId = null }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const [complexity, setComplexityState] = useState(() => {
    return localStorage.getItem('complexity') || 'simple';
  });

  // Apply dark class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('complexity', complexity);
  }, [complexity]);

  async function persistToFirestore(updates) {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        'preferences.theme': updates.theme ?? theme,
        'preferences.complexity': updates.complexity ?? complexity,
      });
    } catch {
      // Non-critical — local state is already updated
    }
  }

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    await persistToFirestore({ theme: next });
  };

  const toggleComplexity = async () => {
    const next = complexity === 'simple' ? 'detailed' : 'simple';
    setComplexityState(next);
    await persistToFirestore({ complexity: next });
  };

  const value = {
    theme,
    complexity,
    isDark: theme === 'dark',
    isDetailed: complexity === 'detailed',
    toggleTheme,
    toggleComplexity,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
