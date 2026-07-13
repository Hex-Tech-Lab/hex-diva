'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved === 'dark' || (saved === null && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');

    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!isMounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-gold-100 dark:bg-gold-900/30 border border-gold-200 dark:border-gold-700 hover:bg-gold-200 dark:hover:bg-gold-800 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg className="w-5 h-5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a1 1 0 11 1.414-1.414l2.12 2.12a1 1 0 11-1.414 1.414zM2.05 6.464a1 1 0 111.414-1.414l2.12 2.12a1 1 0 11-1.414 1.414L2.05 6.464zm0 6.364a1 1 0 111.414 1.414l2.12-2.12a1 1 0 11-1.414-1.414L2.05 12.828z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
