import type { Result } from './training';

/**
 * Runs are comparable when they played the same chart the same way. Tempo is
 * part of that for generated plans, since it is the main thing a player raises.
 */
export function recordKey(r: Result) {
  const format = r.format ?? 'falling';
  const challenge = r.challenge ?? 'standard';
  return [
    format,
    challenge,
    challenge === 'endless' ? r.limit : '',
    r.songId ? `song:${r.songId}:${r.difficulty ?? 'normal'}` : r.mode,
    format === 'falling' && !r.songId ? r.bpm : '',
  ].join('|');
}

/** The number a run is judged by, higher is better. */
export function recordValue(r: Result) {
  if (r.format === 'static')
    return r.challenge === 'endless' ? r.hits : -(r.durationMs ?? Infinity);
  return r.score ?? r.accuracy;
}

export function formatRecord(r: Result) {
  if (r.format === 'static')
    return r.challenge === 'endless'
      ? `${r.hits} groups`
      : `${((r.durationMs ?? 0) / 1000).toFixed(2)} s`;
  return r.score !== undefined
    ? r.score.toLocaleString('en-US')
    : `${r.accuracy}%`;
}

export function bestRecord(history: Result[], key: string) {
  let best: Result | undefined;
  for (const r of history)
    if (
      recordKey(r) === key &&
      (!best ||
        recordValue(r) > recordValue(best) ||
        (recordValue(r) === recordValue(best) && r.accuracy > best.accuracy))
    )
      best = r;
  return best;
}

/** True when `result` beats every earlier comparable run in `history`. */
export function isPersonalBest(result: Result, history: Result[]) {
  const key = recordKey(result);
  const earlier = history.filter(
    (r) => r !== result && recordKey(r) === key && r.date < result.date,
  );
  return (
    earlier.length > 0 &&
    earlier.every((r) => recordValue(result) > recordValue(r))
  );
}

/** Share of a lane's notes that were hit, or null when it had none. */
export function laneHitRate(lane: { hits: number; misses: number }) {
  const total = lane.hits + lane.misses;
  return total ? lane.hits / total : null;
}
