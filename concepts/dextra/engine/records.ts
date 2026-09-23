import type { Result } from '../model/training.ts';
import type { RecordConfiguration } from '../model/records.ts';
import { validHanon } from './hanon.ts';
import type { HanonConfig } from './hanon.ts';

export type Rating = {
  value: number;
  label: string;
  unit: '%' | 'eff/min' | 'eff s';
  kind: 'accuracy' | 'efficiency' | 'endurance';
};
const round = (n: number) => Math.round(n * 100) / 100;
/** Score policy v1. Compare only within configurationKey, never across modes. */
export function practiceRating(r: Result): Rating | null {
  if (
    !Number.isFinite(r.accuracy) ||
    r.accuracy < 0 ||
    r.accuracy > 100 ||
    !Number.isFinite(r.hits) ||
    r.hits < 0 ||
    !Number.isFinite(r.total) ||
    r.total < 0
  )
    return null;
  const accuracy = r.accuracy / 100;
  if (r.format === 'static') {
    const seconds =
      r.challenge === 'endless' ? r.limit : (r.durationMs ?? 0) / 1000;
    if (
      !seconds ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      (r.challenge !== 'endless' && (r.total <= 0 || r.hits !== r.total))
    )
      return null;
    const value = round(((r.hits * 60) / seconds) * accuracy ** 2);
    if (!Number.isFinite(value)) return null;
    return {
      value,
      label: 'Efficiency',
      unit: 'eff/min',
      kind: 'efficiency',
    };
  }
  if (r.challenge === 'endless') {
    if (!Number.isFinite(r.durationMs) || r.durationMs! < 0) return null;
    return {
      value: round((r.durationMs! / 1000) * accuracy ** 2),
      label: 'Endurance',
      unit: 'eff s',
      kind: 'endurance',
    };
  }
  return {
    value: round(r.accuracy),
    label: 'Accuracy',
    unit: '%',
    kind: 'accuracy',
  };
}
export function ratingText(rating: Rating | null) {
  return rating
    ? `${rating.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}${rating.unit === '%' ? '%' : ` ${rating.unit}`}`
    : '—';
}
export function validConfiguration(
  value: unknown,
): value is RecordConfiguration {
  if (!value || typeof value !== 'object') return false;
  const c = value as RecordConfiguration;
  return (
    c.version === 1 &&
    typeof c.exercise === 'string' &&
    c.exercise.length > 0 &&
    ['falling', 'static'].includes(c.format) &&
    ['standard', 'endless'].includes(c.challenge) &&
    ['up', 'down'].includes(c.direction) &&
    Array.isArray(c.keys) &&
    c.keys.length === 6 &&
    new Set(c.keys).size === 6 &&
    c.keys.every((k) => typeof k === 'string') &&
    Array.isArray(c.mapping) &&
    c.mapping.length === 6 &&
    c.mapping.every((n) => Number.isInteger(n) && n >= 0 && n <= 4) &&
    Number.isFinite(c.bpm) &&
    c.bpm > 0 &&
    Number.isFinite(c.limit) &&
    c.limit > 0 &&
    Number.isFinite(c.windows?.perfect) &&
    Number.isFinite(c.windows?.good) &&
    c.windows.perfect > 0 &&
    c.windows.good >= c.windows.perfect &&
    (c.exercise !== 'hanon' || validHanon(c.hanon)) &&
    (c.hanon === undefined || validHanon(c.hanon)) &&
    (c.song === undefined ||
      (c.song !== null &&
        typeof c.song.id === 'string' &&
        ['easy', 'normal', 'hard'].includes(c.song.difficulty) &&
        Number.isFinite(c.song.gridOffset) &&
        Number.isFinite(c.song.audioOffset) &&
        typeof c.song.chart === 'string'))
  );
}
/** Canonical tuple avoids object insertion order and ignores irrelevant static settings. */
export function configurationKey(c?: RecordConfiguration): string | null {
  if (!validConfiguration(c)) return null;
  return JSON.stringify([
    c.version,
    c.exercise,
    c.format,
    c.challenge,
    c.direction,
    c.keys,
    c.mapping,
    c.format === 'falling' ? [c.bpm, c.windows.perfect, c.windows.good] : null,
    c.challenge === 'endless' ? c.limit : null,
    c.hanon
      ? [
          c.hanon.queue,
          c.hanon.repeat,
          c.hanon.traversal,
          c.format === 'falling' ? c.hanon.division : null,
        ]
      : null,
    c.song
      ? [
          c.song.id,
          c.song.difficulty,
          c.song.gridOffset,
          c.song.audioOffset,
          c.song.chart,
        ]
      : null,
  ]);
}
/** Fingerprint the generated song chart without storing every note in each result. */
export function chartFingerprint(notes: { at: number; lanes: number[] }[]) {
  const text = JSON.stringify(notes.map((n) => [n.at, n.lanes]));
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${notes.length}-${(hash >>> 0).toString(16)}`;
}
export function matchingRecords(
  history: Result[],
  configuration?: RecordConfiguration,
) {
  const key = configurationKey(configuration);
  return key
    ? history.filter((r) => configurationKey(r.configuration) === key)
    : [];
}
export function bestRecord(records: Result[]) {
  return records.reduce<Result | null>((best, r) => {
    const score = practiceRating(r);
    return score && (!best || score.value > practiceRating(best)!.value)
      ? r
      : best;
  }, null);
}
export function benchmark(result: Result, history: Result[]) {
  const rating = practiceRating(result);
  if (!configurationKey(result.configuration) || !rating) return null;
  const peers = matchingRecords(history, result.configuration);
  const allBest = bestRecord([...peers, result])!;
  const index = peers.findIndex(
    (r) => r === result || (!!r.id && r.id === result.id),
  );
  const prior =
    index >= 0
      ? peers.slice(index + 1)
      : peers.filter((r) => Date.parse(r.date) < Date.parse(result.date));
  const previous = bestRecord(prior);
  const priorRating = previous ? practiceRating(previous)! : null;
  return {
    rating,
    best: practiceRating(allBest)!,
    isBest: rating.value === practiceRating(allBest)!.value,
    status: !priorRating
      ? 'first'
      : rating.value > priorRating.value
        ? 'new'
        : rating.value === priorRating.value
          ? 'tied'
          : 'below',
    improvement: priorRating ? round(rating.value - priorRating.value) : null,
  };
}
export function sessionLabel(
  format: Result['format'],
  challenge: Result['challenge'],
) {
  return challenge === 'endless'
    ? format === 'static'
      ? 'Timed'
      : 'Survival'
    : 'Fixed';
}
export function hanonSummary(hanon: HanonConfig, includeDivision = true) {
  const traversal =
    hanon.traversal === 'both'
      ? 'up + down'
      : hanon.traversal === 'up'
        ? 'up only'
        : 'down only';
  return `Hanon ${hanon.queue.join(' → ')} · ${hanon.repeat}× · ${traversal}${includeDivision ? ` · 1/${hanon.division}` : ''}`;
}
export function configurationSummary(c: RecordConfiguration) {
  return [
    c.format === 'static' ? 'Static' : 'Falling',
    sessionLabel(c.format, c.challenge),
    c.format === 'falling'
      ? `${c.bpm} BPM · ±${c.windows.perfect}/${c.windows.good} ms`
      : null,
    c.challenge === 'endless'
      ? `${c.limit}${c.format === 'static' ? 's' : ' lives'}`
      : null,
    c.hanon ? hanonSummary(c.hanon, c.format === 'falling') : null,
    c.song
      ? `${c.song.difficulty} · grid ${c.song.gridOffset}s · audio ${c.song.audioOffset}ms`
      : null,
    `scroll ${c.direction}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
export type HistoryFilter = {
  format: string;
  session: string;
  exercise: string;
  configuration: string;
};
/** One facet key shared by the Exercise filter and its Configuration options. */
export function recordExerciseKey(result: Result) {
  return result.songId ? `song:${result.songId}` : result.mode;
}
export function filterRecords(
  history: Result[],
  filter: HistoryFilter,
  current?: RecordConfiguration,
) {
  const key =
    filter.configuration === 'current'
      ? configurationKey(current)
      : filter.configuration;
  return history.filter(
    (r) =>
      (filter.format === 'all' || (r.format ?? 'falling') === filter.format) &&
      (filter.session === 'all' ||
        sessionLabel(r.format, r.challenge) === filter.session) &&
      (filter.exercise === 'all' || recordExerciseKey(r) === filter.exercise) &&
      (filter.configuration === 'all' ||
        (filter.configuration === 'legacy'
          ? !configurationKey(r.configuration)
          : key !== null && configurationKey(r.configuration) === key)),
  );
}
