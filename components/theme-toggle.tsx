'use client';

import { useSyncExternalStore } from 'react';
type Theme = 'light' | 'dark';

function ThemeIcon({ theme }: { theme: Theme | null }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {theme === 'dark' ? (
        <>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 2.75v1.5M12 19.75v1.5M5.46 5.46l1.06 1.06M17.48 17.48l1.06 1.06M2.75 12h1.5M19.75 12h1.5M5.46 18.54l1.06-1.06M17.48 6.52l1.06-1.06" />
        </>
      ) : (
        <path d="M19.35 15.28A7.75 7.75 0 0 1 8.72 4.65a7.75 7.75 0 1 0 10.63 10.63Z" />
      )}
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (notify) => {
      window.addEventListener('site-atlas-theme-change', notify);
      return () => window.removeEventListener('site-atlas-theme-change', notify);
    },
    () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    () => null,
  );

  function toggleTheme() {
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('site-atlas-theme', next);
    window.dispatchEvent(new Event('site-atlas-theme-change'));
  }

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className="theme-toggle" data-current-theme={theme ?? undefined} onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
      <ThemeIcon theme={theme} />
    </button>
  );
}
