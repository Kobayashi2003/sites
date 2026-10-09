import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANALYSIS_RATE,
  alignPhase,
  analyzeSamples,
  generateChart,
} from './audio.ts';

const mapping = [0, 0, 1, 2, 3, 4];

/** Click track: low thumps on beats 1 and 3, bright ticks on 2 and 4. */
function clickTrack({ bpm = 120, offset = 0.3, seconds = 20 } = {}) {
  const samples = new Float32Array(Math.round(seconds * ANALYSIS_RATE));
  const beat = 60 / bpm;
  for (let n = 0; offset + n * beat < seconds - 0.2; n++) {
    const start = Math.round((offset + n * beat) * ANALYSIS_RATE);
    const hz = n % 2 === 0 ? 70 : 5200;
    for (let i = 0; i < 0.08 * ANALYSIS_RATE; i++) {
      const t = i / ANALYSIS_RATE;
      samples[start + i] +=
        0.8 * Math.exp(-t * 45) * Math.sin(2 * Math.PI * hz * t);
    }
  }
  return samples;
}

test('analysis recovers tempo, beat phase and onset bands from a click track', () => {
  const analysis = analyzeSamples(clickTrack());
  assert.ok(Math.abs(analysis.bpm - 120) < 1, `bpm ${analysis.bpm}`);
  const phase = (((analysis.offset - 0.3) % 0.5) + 0.5) % 0.5;
  assert.ok(Math.min(phase, 0.5 - phase) < 0.03, `offset ${analysis.offset}`);
  const strong = analysis.onsets;
  assert.ok(Math.abs(strong.length - 40) <= 3, `onsets ${strong.length}`);
  assert.ok(strong.every((o) => o.strength >= 0 && o.strength <= 1));
  const early = strong.filter((o) => o.time < 2.2);
  assert.equal(early[0].band, 0);
  assert.equal(early[1].band, 2);
  assert.ok(
    Math.abs(
      alignPhase(analysis.envelope, analysis.frameRate, 120) - analysis.offset,
    ) < 0.03,
  );
});

test('generated charts follow the grid and stay physically playable', () => {
  const analysis = analyzeSamples(
    clickTrack({ bpm: 128, offset: 0.12, seconds: 24 }),
  );
  const counts = {};
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const notes = generateChart(analysis, {
      bpm: analysis.bpm,
      offset: analysis.offset,
      difficulty,
      mapping,
    });
    counts[difficulty] = notes.length;
    assert.ok(notes.length > 20, `${difficulty}: ${notes.length} notes`);
    const beat = 60000 / analysis.bpm;
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      assert.ok(note.at >= 0 && note.at <= analysis.duration * 1000);
      assert.equal(
        new Set(note.lanes.map((l) => mapping[l])).size,
        note.lanes.length,
      );
      assert.ok(note.lanes.every((l) => l >= 0 && l <= 5));
      const beats = (note.at - analysis.offset * 1000) / beat;
      assert.ok(
        Math.abs(beats * 4 - Math.round(beats * 4)) < 0.05,
        `off-grid note at ${note.at}`,
      );
      if (i) assert.ok(note.at - notes[i - 1].at >= 120, 'minimum spacing');
    }
    assert.deepEqual(
      generateChart(analysis, {
        bpm: analysis.bpm,
        offset: analysis.offset,
        difficulty,
        mapping,
      }),
      notes,
      'deterministic',
    );
  }
  assert.ok(counts.easy <= counts.normal && counts.normal <= counts.hard);
  const normal = generateChart(analysis, {
    bpm: analysis.bpm,
    offset: analysis.offset,
    difficulty: 'normal',
    mapping,
  });
  const chords = normal.filter((n) => n.lanes.length > 1).length;
  assert.ok(
    chords / normal.length <= 0.15,
    `chord share ${chords}/${normal.length}`,
  );
  const solo = generateChart(analysis, {
    bpm: analysis.bpm,
    offset: analysis.offset,
    difficulty: 'hard',
    mapping: [0, 0, 0, 0, 0, 0],
  });
  assert.ok(
    solo.every((n) => n.lanes.length === 1),
    'one finger cannot play chords',
  );
});
