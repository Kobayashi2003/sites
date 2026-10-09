export const fingers = ['Pinky', 'Ring', 'Middle', 'Index', 'Thumb'];
/** Piano fingering: thumb 1 through pinky 5. */
export const fingerNumber = (finger: number) => 5 - finger;
export const defaults = ['ShiftLeft', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'Space'];
export const defaultFingers = [0, 0, 1, 2, 3, 4];
export const keyOptions = [
  ...new Set([
    ...defaults,
    ...Array.from(
      { length: 26 },
      (_, i) => `Key${String.fromCharCode(65 + i)}`,
    ),
    ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
    'ShiftRight',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
  ]),
];
/** Survival lives and timed-random limits offered in Setup. */
export const lifeOptions = [1, 3, 5, 10];
export const timeOptions = [30, 60, 120];
export type Status = 'idle' | 'running' | 'paused' | 'done';
/** Oldest runs are dropped beyond this, so local storage stays small. */
export const HISTORY_LIMIT = 500;
/**
 * What one lane's key did in a run. Static runs have no misses or timing:
 * `extras` there counts wrong presses on that key.
 */
export type LaneResult = {
  hits: number;
  misses: number;
  extras: number;
  /** Mean signed offset in ms, negative early; null without timed hits. */
  meanOffset: number | null;
};
export type Result = {
  /** Absent in records saved before per-lane results existed. */
  lanes?: LaneResult[];
  date: string;
  mode: string;
  accuracy: number;
  hits: number;
  total: number;
  bpm: number;
  input?: string;
  format?: 'falling' | 'static';
  challenge?: 'standard' | 'endless';
  limit?: number;
  direction?: 'down' | 'up';
  durationMs?: number;
  errors?: number;
  errorRate?: number;
  windows?: { perfect: number; good: number };
  /** Falling runs only; absent in records saved before scoring existed. */
  score?: number;
  maxScore?: number;
  rank?: string;
  /** Imported-song runs; `mode` holds the song name. */
  songId?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  judgements?: {
    perfect: number;
    good: number;
    misses: number;
    extras: number;
    best: number;
    early: number;
    late: number;
    meanOffset: number;
    meanAbsoluteOffset: number;
    pureplus?: number;
  };
};

export function keyLabel(code: string) {
  return (
    (
      {
        Space: 'SPACE',
        ShiftLeft: 'SHIFT',
        ShiftRight: 'R SHIFT',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
      } as Record<string, string>
    )[code] ?? code.replace('Key', '').replace('Digit', '')
  );
}
