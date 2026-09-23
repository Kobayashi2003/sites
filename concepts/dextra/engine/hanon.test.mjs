import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultHanon,
  hanonPatterns,
  hanonSteps,
  hanonInterval,
  validHanon,
  MAX_QUEUE,
  MAX_REPEAT,
} from './hanon.ts';
import {
  createRhythm,
  advanceRhythm,
  pressRhythm,
  releaseRhythm,
  rhythmSummary,
  LEAD_IN,
} from './rhythm.ts';
import {
  createStatic,
  pressStatic,
  releaseStatic,
  staticSummary,
} from './static.ts';
const mapping = [0, 0, 1, 2, 3, 4];

test('source catalog contains 18 studies with valid eight-note phrases and no invented study 17', () => {
  assert.equal(hanonPatterns.length, 18);
  assert.equal(new Set(hanonPatterns.map((p) => p[0])).size, 18);
  assert.ok(!hanonPatterns.some((p) => p[0] === '17'));
  for (const [, up, down] of hanonPatterns) {
    assert.match(up, /^[1-6]{8}$/);
    assert.match(down, /^[1-6]{8}$/);
  }
});
test('queue preserves source phrase order, repetitions and duplicate studies', () => {
  const config = { ...defaultHanon, queue: ['01', '19', '01'] };
  const steps = hanonSteps(config);
  const phrase = (start) =>
    steps
      .slice(start, start + 8)
      .map((s) => s.lanes[0] + 1)
      .join('');
  assert.equal(steps.length, 96);
  assert.equal(phrase(0), '13456543');
  assert.equal(phrase(8), '13456543');
  assert.equal(phrase(16), '64321234');
  assert.equal(phrase(24), '64321234');
  assert.equal(phrase(32), '16456435');
  assert.equal(phrase(64), '13456543');
  assert.equal(steps[24].repetition, 2);
  assert.equal(steps[64].position, 2);
});
test('single-direction chart respects BPM, note values, and lead-in', () => {
  for (const division of [4, 8, 16]) {
    const config = { queue: ['03'], repeat: 1, traversal: 'down', division };
    const chart = createRhythm(120, mapping, 'hanon', undefined, 0, config);
    assert.equal(chart.notes.length, 8);
    assert.equal(chart.notes[0].at, LEAD_IN);
    assert.equal(
      chart.notes[1].at - chart.notes[0].at,
      hanonInterval(120, division),
    );
    assert.equal(chart.notes.map((n) => n.lanes[0] + 1).join(''), '63123432');
  }
});
test('invalid persisted configurations cannot expand into unbounded charts', () => {
  for (const value of [
    null,
    {},
    { ...defaultHanon, queue: [] },
    { ...defaultHanon, queue: ['17'] },
    { ...defaultHanon, queue: Array(MAX_QUEUE + 1).fill('01') },
    { ...defaultHanon, repeat: MAX_REPEAT + 1 },
    { ...defaultHanon, repeat: 1.5 },
    { ...defaultHanon, division: 0 },
    { ...defaultHanon, traversal: 'sideways' },
  ]) {
    assert.equal(validHanon(value), false);
  }
  const config = {
    ...defaultHanon,
    repeat: MAX_REPEAT,
    queue: Array(MAX_QUEUE).fill('01'),
  };
  assert.equal(hanonSteps(config).length, 6144);
});
test('Hanon falling and static sessions finish with exact chart totals', () => {
  const config = { ...defaultHanon, queue: ['01'], repeat: 1 };
  const chart = createRhythm(120, mapping, 'hanon', undefined, 0, config);
  for (const note of chart.notes) {
    advanceRhythm(chart, note.at);
    pressRhythm(chart, note.lanes[0], note.at);
    releaseRhythm(chart, note.lanes[0]);
  }
  const score = rhythmSummary(chart);
  assert.equal(score.done, true);
  assert.equal(score.rank, 'S');
  assert.equal(score.score, chart.maxScore);
  assert.equal(score.total, 16);
  const stationary = createStatic(hanonSteps(config).map((s) => s.lanes));
  for (const group of stationary.groups) {
    pressStatic(stationary, group[0]);
    releaseStatic(stationary, group[0]);
  }
  assert.equal(staticSummary(stationary).done, true);
  assert.equal(stationary.index, 16);
});
