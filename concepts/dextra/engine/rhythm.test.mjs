import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceRhythm,
  createRhythm,
  HIT_WINDOW,
  HIT_LINE,
  notePosition,
  LEAD_IN,
  pressRhythm,
  releaseRhythm,
  rhythmSummary,
} from './rhythm.ts';

const mapping = [0, 0, 1, 2, 3, 4];
test('chart has a lead-in, BPM spacing, and physically distinct chords', () => {
  const state = createRhythm(120, mapping);
  assert.equal(state.notes.length, 32);
  assert.equal(state.notes[0].at, LEAD_IN);
  assert.equal(state.notes[1].at - state.notes[0].at, 500);
  for (const note of state.notes)
    assert.equal(
      new Set(note.lanes.map((lane) => mapping[lane])).size,
      note.lanes.length,
    );
  assert.ok(
    createRhythm(60, [0, 0, 0, 0, 0, 0]).notes.every(
      (n) => n.lanes.length === 1,
    ),
  );
});
test('perfect and good windows include their boundaries', () => {
  for (const [offset, expected] of [
    [-100, 'good'],
    [-50, 'perfect'],
    [0, 'perfect'],
    [50, 'perfect'],
    [100, 'good'],
  ]) {
    const state = createRhythm(60, mapping);
    pressRhythm(state, 0, LEAD_IN + offset);
    assert.equal(state.notes[0].grade, expected);
  }
});
test('misses settle once, using elapsed time rather than frame count', () => {
  const state = createRhythm(60, mapping);
  advanceRhythm(state, LEAD_IN + HIT_WINDOW);
  assert.equal(state.notes[0].grade, 'pending');
  advanceRhythm(state, LEAD_IN + HIT_WINDOW + 1);
  advanceRhythm(state, LEAD_IN + HIT_WINDOW + 20);
  assert.equal(rhythmSummary(state).misses, 1);
});
test('lead-in is unscored; holding through a note never counts as a fresh press', () => {
  const state = createRhythm(60, mapping);
  pressRhythm(state, 0, 1000);
  pressRhythm(state, 0, LEAD_IN);
  assert.equal(state.notes[0].grade, 'pending');
  assert.equal(state.extras, 0);
  releaseRhythm(state, 0);
  pressRhythm(state, 0, LEAD_IN + 20);
  assert.equal(state.notes[0].grade, 'perfect');
});
test('repeated keydown cannot score twice; extra input reduces accuracy', () => {
  const state = createRhythm(60, mapping);
  pressRhythm(state, 0, LEAD_IN);
  pressRhythm(state, 0, LEAD_IN + 10);
  assert.equal(rhythmSummary(state).hits, 1);
  assert.equal(state.extras, 0);
  pressRhythm(state, 1, LEAD_IN + 15);
  assert.equal(state.extras, 1);
  assert.equal(rhythmSummary(state).accuracy, 50);
  assert.equal(state.combo, 0);
});
test('a chord needs simultaneous held keys, not disconnected taps', () => {
  const state = createRhythm(60, mapping);
  const note = state.notes[7];
  const [a, b] = note.lanes;
  pressRhythm(state, a, note.at - 40);
  releaseRhythm(state, a);
  pressRhythm(state, b, note.at);
  assert.equal(note.grade, 'pending');
  pressRhythm(state, a, note.at + 30);
  assert.equal(note.grade, 'perfect');
});
test('partial chord expires as one miss', () => {
  const state = createRhythm(60, mapping);
  const note = state.notes[7];
  pressRhythm(state, note.lanes[0], note.at);
  advanceRhythm(state, note.at + 141);
  assert.equal(note.grade, 'miss');
  assert.equal(rhythmSummary(state).misses, 8);
});
test('a full clean chart produces one hundred percent and stops accepting inputs', () => {
  const state = createRhythm(150, mapping);
  for (const note of state.notes) {
    for (const lane of note.lanes) pressRhythm(state, lane, note.at);
    for (const lane of note.lanes) releaseRhythm(state, lane);
  }
  assert.equal(rhythmSummary(state).accuracy, 100);
  assert.equal(rhythmSummary(state).done, true);
  assert.equal(state.best, 32);
  pressRhythm(state, 0, state.elapsed + 50);
  assert.equal(state.extras, 0);
});
test('elapsed time cannot rewind', () => {
  const state = createRhythm(60, mapping);
  advanceRhythm(state, 3500);
  advanceRhythm(state, 2000);
  assert.equal(state.elapsed, 3500);
});

test('scroll speed changes lookahead, never the hit timestamp', () => {
  for (const speed of [0.5, 1, 2, 4]) {
    assert.equal(notePosition(3000, 3000, speed), HIT_LINE);
    assert.ok(
      notePosition(3000, 3140, speed) < 100,
      'the entire late window remains visible',
    );
  }
  assert.equal(
    HIT_LINE - notePosition(3000, 2500, 2),
    2 * (HIT_LINE - notePosition(3000, 2500, 1)),
  );
});

test('timing summary uses signed worst chord offsets and ignores misses/extras', () => {
  const state = createRhythm(60, mapping);
  pressRhythm(state, 0, 2950);
  releaseRhythm(state, 0);
  pressRhythm(state, 2, 4100);
  releaseRhythm(state, 2);
  pressRhythm(state, 5, 4300);
  advanceRhythm(state, 5141);
  const stats = rhythmSummary(state);
  assert.equal(stats.early, 1);
  assert.equal(stats.late, 1);
  assert.equal(stats.meanOffset, 25);
  assert.equal(stats.meanAbsoluteOffset, 75);
  assert.equal(stats.extras, 1);
  assert.equal(stats.misses, 1);
  assert.equal(state.lastJudgement.grade, 'miss');
  const chord = state.notes[7];
  pressRhythm(state, chord.lanes[0], chord.at - 100);
  pressRhythm(state, chord.lanes[1], chord.at + 20);
  assert.equal(state.lastJudgement.grade, 'good');
  assert.equal(state.lastJudgement.offset, -100);
  assert.match(state.feedback, /-100 ms/);
});

test('library plans produce distinct charts within the same scoring engine', () => {
  const isolated = createRhythm(60, mapping, 'isolation');
  assert.deepEqual(
    isolated.notes.slice(0, 4).map((n) => n.lanes),
    [[0], [0], [0], [0]],
  );
  assert.deepEqual(isolated.notes[4].lanes, [1]);
  const alternating = createRhythm(60, mapping, 'alternating');
  assert.deepEqual(
    alternating.notes.slice(0, 4).map((n) => n.lanes),
    [[0], [1], [0], [1]],
  );
  const chords = createRhythm(60, mapping, 'chords');
  assert.ok(
    chords.notes.every(
      (n) =>
        n.lanes.length === 2 && mapping[n.lanes[0]] !== mapping[n.lanes[1]],
    ),
  );
  const fallback = createRhythm(60, [0, 0, 0, 0, 0, 0], 'chords');
  assert.ok(fallback.notes.every((n) => n.lanes.length === 1));
  for (const state of [isolated, alternating, chords, fallback]) {
    for (const note of state.notes) {
      for (const lane of note.lanes) pressRhythm(state, lane, note.at);
      for (const lane of note.lanes) releaseRhythm(state, lane);
    }
    assert.equal(rhythmSummary(state).perfect, 32);
    assert.equal(rhythmSummary(state).accuracy, 100);
  }
});

test('custom windows change grades and misses without changing note timestamps', () => {
  const state = createRhythm(60, mapping, 'mixed', { perfect: 25, good: 80 });
  pressRhythm(state, 0, LEAD_IN + 30);
  assert.equal(state.notes[0].grade, 'good');
  advanceRhythm(state, state.notes[1].at + 81);
  assert.equal(state.notes[1].grade, 'miss');
  assert.equal(state.notes[2].at, LEAD_IN + 2000);
});

test('survival stops exactly when lives run out', () => {
  const s = createRhythm(60, mapping, 'random', { perfect: 60, good: 140 }, 3);
  advanceRhythm(s, LEAD_IN + 2141);
  assert.equal(s.lives, 0);
  assert.equal(rhythmSummary(s).done, true);
  assert.equal(rhythmSummary(s).misses, 3);
  pressRhythm(s, 0, LEAD_IN + 3000);
  assert.equal(s.extras, 0);
  const extra = createRhythm(
    60,
    mapping,
    'random',
    { perfect: 60, good: 140 },
    1,
  );
  pressRhythm(
    extra,
    [0, 1, 2, 3, 4, 5].find((lane) => !extra.notes[0].lanes.includes(lane)),
    LEAD_IN,
  );
  assert.equal(extra.lives, 0);
  assert.equal(extra.extras, 1);
});
test('survival generates beyond the initial chart while retaining bounded active notes', () => {
  const s = createRhythm(60, mapping, 'random', { perfect: 60, good: 140 }, 3);
  for (let i = 0; i < 1000; i++) {
    const n = s.notes.find((n) => n.grade === 'pending');
    assert.ok(n);
    for (const lane of n.lanes) pressRhythm(s, lane, n.at);
    for (const lane of n.lanes) releaseRhythm(s, lane);
  }
  const stats = rhythmSummary(s);
  assert.equal(stats.hits, 1000);
  assert.equal(stats.accuracy, 100);
  assert.equal(s.lives, 3);
  assert.equal(stats.done, false);
  assert.ok(s.notes.length < 70);
});
