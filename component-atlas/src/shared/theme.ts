export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'component-atlas-theme';

/** Saved choice, else the system preference. Storage can be blocked, so it is optional. */
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* Fall back to the system preference. */
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* The theme still applies for this visit. */
  }
}
