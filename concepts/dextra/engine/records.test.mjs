import assert from 'node:assert/strict';
import test from 'node:test';
import {
  practiceRating,
  configurationKey,
  validConfiguration,
  benchmark,
  matchingRecords,
  filterRecords,
  chartFingerprint,
  recordExerciseKey,
} from './records.ts';
const config = {
  version: 1,
  exercise: 'mixed',
  format: 'falling',
  challenge: 'standard',
  direction: 'down',
  keys: ['ShiftLeft', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'Space'],
  mapping: [0, 0, 1, 2, 3, 4],
  bpm: 60,
  limit: 3,
  windows: { perfect: 50, good: 100 },
};
const run = (patch = {}) => ({
  id: 'one',
  date: '2026-09-22T10:00:00Z',
  mode: 'Rhythm flow',
  accuracy: 90,
  hits: 32,
  total: 32,
  bpm: 60,
  format: 'falling',
  challenge: 'standard',
  durationMs: 30000,
  configuration: config,
  ...patch,
});
test('fixed falling ranks by accuracy, independent of arcade score', () => {
  assert.equal(practiceRating(run({ score: 100000 })).value, 90);
  assert.equal(practiceRating(run({ score: 1, accuracy: 95 })).value, 95);
});
test('static efficiency rewards speed but penalizes errors quadratically', () => {
  const clean = practiceRating(run({ format: 'static', accuracy: 100 }));
  assert.equal(clean.value, 64);
  assert.equal(practiceRating(run({ format: 'static' })).value, 51.84);
  assert.equal(
    practiceRating(run({ format: 'static', durationMs: 60000, accuracy: 100 }))
      .value,
    32,
  );
});
test('timed static uses its selected limit, not a short recorded duration', () => {
  assert.equal(
    practiceRating(
      run({
        format: 'static',
        challenge: 'endless',
        limit: 60,
        durationMs: 100,
        hits: 40,
      }),
    ).value,
    32.4,
  );
});
test('survival rewards accuracy-adjusted survival time and safely handles zero', () => {
  assert.equal(
    practiceRating(run({ challenge: 'endless', durationMs: 100000 })).value,
    81,
  );
  assert.equal(
    practiceRating(run({ challenge: 'endless', durationMs: 0, accuracy: 0 }))
      .value,
    0,
  );
});
test('missing, incomplete and invalid data do not receive a fabricated rating', () => {
  for (const patch of [
    { accuracy: NaN },
    { accuracy: 101 },
    { accuracy: -1 },
    { total: NaN },
    { format: 'static', durationMs: Number.MIN_VALUE },
    { format: 'static', durationMs: 0 },
    { format: 'static', durationMs: undefined },
    { format: 'static', hits: 31 },
    { format: 'static', challenge: 'endless', limit: undefined },
    { challenge: 'endless', durationMs: undefined },
  ])
    assert.equal(practiceRating(run(patch)), null);
});
test('configuration identity separates every difficulty-affecting setting', () => {
  const original = configurationKey(config);
  for (const patch of [
    { bpm: 65 },
    { windows: { perfect: 30, good: 100 } },
    { direction: 'up' },
    { keys: ['KeyQ', ...config.keys.slice(1)] },
    { mapping: [0, 1, 1, 2, 3, 4] },
    { exercise: 'chords' },
    { format: 'static' },
    { challenge: 'endless' },
  ])
    assert.notEqual(configurationKey({ ...config, ...patch }), original);
  assert.notEqual(
    configurationKey({ ...config, challenge: 'endless', limit: 3 }),
    configurationKey({ ...config, challenge: 'endless', limit: 5 }),
  );
  assert.equal(configurationKey({ ...config, limit: 10 }), original);
});
test('static ignores BPM, timing windows and Hanon note value, but not sequence', () => {
  const hanon = {
    queue: ['01', '02'],
    repeat: 2,
    division: 16,
    traversal: 'both',
  };
  const fixed = { ...config, exercise: 'hanon', format: 'static', hanon };
  assert.equal(
    configurationKey(fixed),
    configurationKey({
      ...fixed,
      bpm: 150,
      windows: { perfect: 20, good: 40 },
      hanon: { ...hanon, division: 4 },
    }),
  );
  assert.notEqual(
    configurationKey(fixed),
    configurationKey({ ...fixed, hanon: { ...hanon, queue: ['02', '01'] } }),
  );
  assert.notEqual(
    configurationKey(fixed),
    configurationKey({ ...fixed, hanon: { ...hanon, repeat: 3 } }),
  );
  assert.notEqual(
    configurationKey(fixed),
    configurationKey({ ...fixed, hanon: { ...hanon, traversal: 'up' } }),
  );
  assert.notEqual(
    configurationKey({ ...fixed, format: 'falling' }),
    configurationKey({
      ...fixed,
      format: 'falling',
      hanon: { ...hanon, division: 4 },
    }),
  );
});
test('songs separate IDs, generated charts, difficulty and calibration', () => {
  const song = {
    id: 'song-a',
    difficulty: 'normal',
    gridOffset: 0,
    audioOffset: 0,
    chart: '32-abc',
  };
  const base = { ...config, exercise: 'song:song-a', song };
  for (const patch of [
    { id: 'song-b' },
    { difficulty: 'hard' },
    { gridOffset: 0.2 },
    { audioOffset: 30 },
    { chart: '32-def' },
  ])
    assert.notEqual(
      configurationKey(base),
      configurationKey({ ...base, song: { ...song, ...patch } }),
    );
  assert.equal(
    chartFingerprint([{ at: 1, lanes: [1] }]),
    chartFingerprint([{ at: 1, lanes: [1] }]),
  );
  assert.notEqual(
    chartFingerprint([{ at: 1, lanes: [1] }]),
    chartFingerprint([{ at: 2, lanes: [1] }]),
  );
});
test('legacy results stay visible but never join a complete configuration', () => {
  const legacy = run({ configuration: undefined });
  assert.equal(configurationKey(undefined), null);
  assert.equal(benchmark(legacy, [legacy]), null);
  assert.deepEqual(matchingRecords([legacy, run()], config), [run()]);
  assert.equal(validConfiguration({ ...config, keys: null }), false);
  assert.equal(validConfiguration({ ...config, song: null }), false);
  assert.equal(validConfiguration({ ...config, exercise: 'hanon' }), false);
});
test('first, new, tied and beaten records use only comparable preceding sessions', () => {
  const first = run();
  const better = run({ id: 'two', accuracy: 95, date: '2026-09-22T11:00:00Z' });
  const tied = run({ id: 'three', accuracy: 95, date: '2026-09-22T12:00:00Z' });
  const low = run({ id: 'four', accuracy: 80, date: '2026-09-22T13:00:00Z' });
  const other = run({
    id: 'other',
    accuracy: 100,
    configuration: { ...config, bpm: 120 },
  });
  const history = [low, tied, better, other, first];
  assert.equal(benchmark(first, history).status, 'first');
  assert.equal(benchmark(better, history).status, 'new');
  assert.equal(benchmark(better, history).improvement, 5);
  assert.equal(benchmark(tied, history).status, 'tied');
  assert.equal(benchmark(low, history).status, 'below');
  assert.equal(benchmark(first, history).isBest, false);
  assert.equal(benchmark(tied, history).isBest, true);
  assert.equal(benchmark(low, history).best.value, 95);
});
test('filters intersect format, session, exercise and exact configuration', () => {
  const legacy = run({ configuration: undefined });
  const staticRun = run({
    format: 'static',
    configuration: { ...config, format: 'static' },
  });
  const history = [run(), legacy, staticRun];
  const all = {
    format: 'all',
    session: 'all',
    exercise: 'all',
    configuration: 'all',
  };
  assert.equal(filterRecords(history, all, config).length, 3);
  assert.equal(
    filterRecords(history, { ...all, configuration: 'current' }, config).length,
    1,
  );
  assert.equal(
    filterRecords(history, { ...all, configuration: 'legacy' }, config).length,
    1,
  );
  assert.equal(
    filterRecords(history, { ...all, format: 'static' }, config).length,
    1,
  );
  assert.equal(
    filterRecords(history, { ...all, session: 'Survival' }, config).length,
    0,
  );
  assert.equal(recordExerciseKey(run()), 'Rhythm flow');
  assert.equal(
    filterRecords(history, { ...all, exercise: 'Rhythm flow' }, config).length,
    3,
  );
  assert.equal(
    filterRecords(history, { ...all, exercise: 'Chord control' }, config)
      .length,
    0,
  );
});
