import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateOffset } from './calibration.ts';

const beats = Array.from({ length: 8 }, (_, i) => 1000 + i * 600);

test('the offset is the median tap delay, robust to one wild tap', () => {
  const taps = beats.map(
    (beat, i) => beat + [40, 35, 45, 38, 42, 200, 41, 39][i],
  );
  const result = estimateOffset(taps, beats);
  assert.equal(result.offset, 41);
  assert.equal(result.taps, 8);
  assert.ok(result.spread <= 3);
});
test('early taps give a negative offset', () => {
  const result = estimateOffset(
    beats.map((beat) => beat - 30),
    beats,
  );
  assert.equal(result.offset, -30);
  assert.equal(result.spread, 0);
});
test('taps far from any click, or two taps on one click, are ignored', () => {
  const taps = [
    beats[0] + 20,
    beats[0] + 25,
    beats[1] + 400,
    beats[2] + 20,
    beats[3] + 20,
    beats[4] + 20,
  ];
  assert.equal(estimateOffset(taps, beats), null, 'only four usable taps');
  assert.equal(estimateOffset([...taps, beats[5] + 20], beats).offset, 20);
});
test('no beats or no taps cannot be calibrated', () => {
  assert.equal(estimateOffset([1, 2, 3], []), null);
  assert.equal(estimateOffset([], beats), null);
});
