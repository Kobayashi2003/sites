/**
 * Tap calibration: the player taps along to clicks, and the typical gap
 * between a click being heard and the tap landing becomes the audio offset.
 * Times are milliseconds on one clock.
 */
export const CALIBRATION_BEATS = 12;
/** Clicks before taps count, so the player can find the pulse. */
export const CALIBRATION_WARMUP = 4;
const MAX_GAP = 250;
const MIN_TAPS = 5;

export type Calibration = {
  /** Median tap delay; positive means taps land after the click. */
  offset: number;
  /** Median absolute deviation, a measure of how steady the taps were. */
  spread: number;
  taps: number;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Null when too few taps landed near a click to trust the estimate. */
export function estimateOffset(
  taps: number[],
  beats: number[],
): Calibration | null {
  if (!beats.length) return null;
  const gaps: number[] = [];
  const used = new Set<number>();
  for (const tap of taps) {
    let best = -1;
    for (let i = 0; i < beats.length; i++)
      if (best < 0 || Math.abs(tap - beats[i]) < Math.abs(tap - beats[best]))
        best = i;
    const gap = tap - beats[best];
    if (Math.abs(gap) > MAX_GAP || used.has(best)) continue;
    used.add(best);
    gaps.push(gap);
  }
  if (gaps.length < MIN_TAPS) return null;
  const offset = median(gaps);
  return {
    offset: Math.round(offset),
    spread: Math.round(median(gaps.map((gap) => Math.abs(gap - offset)))),
    taps: gaps.length,
  };
}
