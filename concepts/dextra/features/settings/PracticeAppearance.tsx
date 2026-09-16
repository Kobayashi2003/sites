'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export type LaneColor = { track: string; key: string; opacity: number };
const defaultColors: LaneColor[] = [
  '#9564df',
  '#416ed4',
  '#416ed4',
  '#416ed4',
  '#416ed4',
  '#e75d72',
].map((track, i) => ({
  track,
  key: '#416ed4',
  opacity: i === 0 || i === 5 ? 18 : 0,
}));
type Preferences = { colors: LaneColor[]; keySound: boolean };
const defaults: Preferences = { colors: defaultColors, keySound: false };
const Context = createContext<{
  preferences: Preferences;
  update: (value: Partial<Preferences>) => void;
  resetColors: () => void;
} | null>(null);
export function PracticeAppearance({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(
          localStorage.getItem('dextra-appearance-v1') || 'null',
        );
        if (
          saved &&
          Array.isArray(saved.colors) &&
          saved.colors.length === 6 &&
          saved.colors.every(
            (c: LaneColor) =>
              c &&
              /^#[0-9a-f]{6}$/i.test(c.track) &&
              /^#[0-9a-f]{6}$/i.test(c.key) &&
              Number.isFinite(c.opacity) &&
              c.opacity >= 0 &&
              c.opacity <= 80,
          )
        ) {
          setPreferences({
            colors: saved.colors,
            keySound: saved.keySound === true,
          });
        }
      } catch {
        /* Optional local preferences. */
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          'dextra-appearance-v1',
          JSON.stringify(preferences),
        );
      } catch {
        /* Practice works without storage. */
      }
  }, [preferences, ready]);
  return (
    <Context.Provider
      value={{
        preferences,
        update: (value) => setPreferences((p) => ({ ...p, ...value })),
        resetColors: () =>
          setPreferences((p) => ({ ...p, colors: defaultColors })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePracticeAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error('PracticeAppearance provider is required');
  return value;
}
export function laneStyle(color: LaneColor): CSSProperties {
  return {
    '--lane-tint': `${color.track}${Math.round(color.opacity * 2.55)
      .toString(16)
      .padStart(2, '0')}`,
    '--key-tint': `${color.key}30`,
    '--key-active': `${color.key}70`,
    '--note-color': `${color.key}b3`,
  } as CSSProperties;
}
