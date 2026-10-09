import { programs } from '../engine/rhythm';
import type { ProgramId } from '../engine/rhythm';
import { DIFFICULTIES } from '../engine/audio';
import type { Difficulty } from '../engine/audio';
import {
  defaultFingers,
  defaults as defaultKeys,
  HISTORY_LIMIT,
  keyOptions,
  lifeOptions,
  timeOptions,
} from './training';
import type { Result } from './training';

export type Theme = 'system' | 'light' | 'dark';
export type Format = 'falling' | 'static';
export type Challenge = 'standard' | 'endless';
export type Direction = 'down' | 'up';
export type Windows = { perfect: number; good: number };
export type LaneColor = { track: string; key: string; opacity: number };

export type Settings = {
  keys: string[];
  mapping: number[];
  program: ProgramId;
  format: Format;
  challenge: Challenge;
  timeLimit: number;
  lives: number;
  direction: Direction;
  windows: Windows;
  bpm: number;
  speed: number;
  showWindow: boolean;
  difficulty: Difficulty;
  songVolume: number;
  audioOffset: number;
  songId: string | null;
  theme: Theme;
  keySound: boolean;
  colors: LaneColor[];
};

export const ARCAEA_WINDOWS: Windows = { perfect: 50, good: 100 };
export const BPM_RANGE = { min: 30, max: 180, step: 5 } as const;
export const SPEED_RANGE = { min: 0.5, max: 4, step: 0.25 } as const;
export const OFFSET_LIMIT = 200;

/**
 * One hue per finger (pinky to thumb), so a lane's color says which finger
 * plays it. Ordered so neighbouring fingers stay apart under colour-vision
 * deficiency; validated against the chart display surface.
 */
export const fingerColors = [
  '#d55181',
  '#3987e5',
  '#c98500',
  '#199e70',
  '#d95926',
];
export const colorsFor = (mapping: number[]): LaneColor[] =>
  mapping.map((finger) => ({
    track: fingerColors[finger],
    key: fingerColors[finger],
    opacity: 10,
  }));

/** Colors every earlier version saved by default; treated as "not chosen". */
const legacyDefaultColors: LaneColor[] = [
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

export const defaultSettings: Settings = {
  keys: defaultKeys,
  mapping: defaultFingers,
  program: 'mixed',
  format: 'falling',
  challenge: 'standard',
  timeLimit: 60,
  lives: 3,
  direction: 'down',
  windows: ARCAEA_WINDOWS,
  bpm: 60,
  speed: 1,
  showWindow: false,
  difficulty: 'normal',
  songVolume: 0.8,
  audioOffset: 0,
  songId: null,
  theme: 'system',
  keySound: false,
  colors: colorsFor(defaultFingers),
};

/* Storage keys kept from earlier versions so saved data carries over. */
const MAIN = 'dextra-v1';
const THEME = 'dextra-theme';
const CHART = 'dextra-chart-v2';
const APPEARANCE = 'dextra-appearance-v1';

type Json = Record<string, unknown>;
const read = (key: string): Json | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' ? (value as Json) : null;
  } catch {
    return null;
  }
};
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const within = (v: unknown, min: number, max: number): v is number =>
  finite(v) && v >= min && v <= max;
const isColor = (c: unknown): c is LaneColor => {
  const v = c as LaneColor;
  return (
    !!v &&
    /^#[0-9a-f]{6}$/i.test(v.track) &&
    /^#[0-9a-f]{6}$/i.test(v.key) &&
    within(v.opacity, 0, 80)
  );
};
const sameColors = (a: LaneColor[], b: LaneColor[]) =>
  a.every(
    (c, i) =>
      c.track.toLowerCase() === b[i].track.toLowerCase() &&
      c.key.toLowerCase() === b[i].key.toLowerCase() &&
      c.opacity === b[i].opacity,
  );

export function validResult(value: unknown): value is Result {
  if (!value || typeof value !== 'object') return false;
  const r = value as Result;
  return (
    typeof r.mode === 'string' &&
    typeof r.date === 'string' &&
    Number.isFinite(Date.parse(r.date)) &&
    [r.accuracy, r.hits, r.total, r.bpm].every(Number.isFinite) &&
    (r.lanes === undefined ||
      (Array.isArray(r.lanes) &&
        r.lanes.length === 6 &&
        r.lanes.every((l) => finite(l?.hits) && finite(l?.misses))))
  );
}

export function loadStored(): { settings: Settings; history: Result[] } {
  const s: Settings = { ...defaultSettings };
  const main = read(MAIN) ?? {};
  const keys = main.keys;
  if (
    Array.isArray(keys) &&
    keys.length === 6 &&
    new Set(keys).size === 6 &&
    keys.every((k) => typeof k === 'string' && keyOptions.includes(k))
  )
    s.keys = keys as string[];
  const mapping = main.mapping;
  if (
    Array.isArray(mapping) &&
    mapping.length === 6 &&
    mapping.every((v) => Number.isInteger(v) && within(v, 0, 4))
  )
    s.mapping = mapping as number[];
  if (programs.some((p) => p.id === main.program))
    s.program = main.program as ProgramId;
  if (main.format === 'falling' || main.format === 'static')
    s.format = main.format;
  if (main.challenge === 'standard' || main.challenge === 'endless')
    s.challenge = main.challenge;
  if (timeOptions.includes(main.timeLimit as number))
    s.timeLimit = main.timeLimit as number;
  if (lifeOptions.includes(main.lives as number))
    s.lives = main.lives as number;
  if (main.direction === 'down' || main.direction === 'up')
    s.direction = main.direction;
  const w = main.windows as Windows | undefined;
  // Version 2 timing replaced the first, looser defaults.
  if (
    main.timingVersion === 2 &&
    within(w?.perfect, 10, 250) &&
    within(w?.good, w!.perfect, 250)
  )
    s.windows = { perfect: w!.perfect, good: w!.good };
  if (within(main.bpm, BPM_RANGE.min, BPM_RANGE.max))
    s.bpm = main.bpm as number;
  if (DIFFICULTIES.some((d) => d.id === main.difficulty))
    s.difficulty = main.difficulty as Difficulty;
  if (within(main.songVolume, 0, 1)) s.songVolume = main.songVolume as number;
  if (within(main.audioOffset, -OFFSET_LIMIT, OFFSET_LIMIT))
    s.audioOffset = main.audioOffset as number;
  if (typeof main.songId === 'string') s.songId = main.songId;
  const history = Array.isArray(main.history)
    ? main.history.filter(validResult).slice(0, HISTORY_LIMIT)
    : [];

  try {
    const theme = localStorage.getItem(THEME);
    if (theme === 'light' || theme === 'dark' || theme === 'system')
      s.theme = theme;
  } catch {
    /* Storage is optional. */
  }
  const chart = read(CHART) ?? {};
  if (within(chart.speed, SPEED_RANGE.min, SPEED_RANGE.max))
    s.speed = chart.speed as number;
  if (typeof chart.showWindow === 'boolean') s.showWindow = chart.showWindow;
  const appearance = read(APPEARANCE) ?? {};
  const colors = appearance.colors;
  if (Array.isArray(colors) && colors.length === 6 && colors.every(isColor))
    s.colors = sameColors(colors, legacyDefaultColors)
      ? colorsFor(s.mapping)
      : colors;
  else s.colors = colorsFor(s.mapping);
  s.keySound = appearance.keySound === true;
  return { settings: s, history };
}

export function saveStored(s: Settings, history: Result[]) {
  try {
    localStorage.setItem(
      MAIN,
      JSON.stringify({
        keys: s.keys,
        mapping: s.mapping,
        history,
        program: s.program,
        format: s.format,
        windows: s.windows,
        timingVersion: 2,
        direction: s.direction,
        challenge: s.challenge,
        timeLimit: s.timeLimit,
        lives: s.lives,
        bpm: s.bpm,
        songId: s.songId,
        difficulty: s.difficulty,
        songVolume: s.songVolume,
        audioOffset: s.audioOffset,
      }),
    );
    localStorage.setItem(THEME, s.theme);
    localStorage.setItem(
      CHART,
      JSON.stringify({ speed: s.speed, showWindow: s.showWindow }),
    );
    localStorage.setItem(
      APPEARANCE,
      JSON.stringify({ colors: s.colors, keySound: s.keySound }),
    );
  } catch {
    /* Practice works without storage. */
  }
}
