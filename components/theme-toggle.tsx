'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';

function ThemeIcon({ theme }: { theme: Theme | null }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {theme === 'dark' ? (
        <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>
      ) : (
        <path d="M20.25 15.13A8.5 8.5 0 0 1 8.87 3.75a8.5 8.5 0 1 0 11.38 11.38Z" />
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
    <Button className="theme-toggle" variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
      <ThemeIcon theme={theme} />
    </Button>
  );
}
