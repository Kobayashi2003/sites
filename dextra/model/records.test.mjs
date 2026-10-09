import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bestRecord,
  formatRecord,
  isPersonalBest,
  laneHitRate,
  recordKey,
} from './records.ts';

const run = (over) => ({
  date: '2026-10-01T10:00:00.000Z',
  mode: 'Rhythm flow',
  format: 'falling',
  challenge: 'standard',
  accuracy: 90,
  hits: 30,
  total: 32,
  bpm: 90,
  score: 8000,
  ...over,
});

test('tempo, challenge and song difficulty separate comparable runs', () => {
  assert.notEqual(recordKey(run()), recordKey(run({ bpm: 100 })));
  assert.notEqual(
    recordKey(run({ challenge: 'endless', limit: 3 })),
    recordKey(run({ challenge: 'endless', limit: 5 })),
  );
  const song = run({ songId: 'a', difficulty: 'hard', mode: 'Song' });
  assert.equal(recordKey(song), recordKey({ ...song, bpm: 128 }));
  assert.notEqual(recordKey(song), recordKey({ ...song, difficulty: 'easy' }));
});
test('static standard prefers the faster time; timed prefers more groups', () => {
  const slow = run({ format: 'static', durationMs: 30000, score: undefined });
  const fast = run({ format: 'static', durationMs: 20000, score: undefined });
  assert.equal(bestRecord([slow, fast], recordKey(slow)), fast);
  const few = run({
    format: 'static',
    challenge: 'endless',
    limit: 60,
    hits: 40,
  });
  const many = { ...few, hits: 55 };
  assert.equal(bestRecord([many, few], recordKey(few)), many);
  assert.equal(formatRecord(fast), '20.00 s');
  assert.equal(formatRecord(many), '55 groups');
});
test('a personal best must beat earlier comparable runs, not the first run', () => {
  const first = run({ date: '2026-10-01T10:00:00.000Z', score: 5000 });
  const second = run({ date: '2026-10-02T10:00:00.000Z', score: 7000 });
  const third = run({ date: '2026-10-03T10:00:00.000Z', score: 6000 });
  const history = [third, second, first];
  assert.equal(isPersonalBest(first, history), false);
  assert.equal(isPersonalBest(second, history), true);
  assert.equal(isPersonalBest(third, history), false);
});
test('lane hit rate is null for unused lanes', () => {
  assert.equal(laneHitRate({ hits: 3, misses: 1 }), 0.75);
  assert.equal(laneHitRate({ hits: 0, misses: 0 }), null);
});
