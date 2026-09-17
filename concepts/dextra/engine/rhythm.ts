export const HIT_WINDOW = 100;
export const PERFECT_WINDOW = 50;
export const LEAD_IN = 3000;
export const TRAVEL_TIME = 2400;
export const HIT_LINE = 80;
/** Pure+ is the inner subdivision of Pure; it never exceeds the Pure window. */
export const PURE_PLUS_WINDOW = 25;
/** Points per lane in a group. Chords score once per key. */
export const NOTE_POINTS = { pureplus: 300, perfect: 250, good: 100 } as const;
export const SCORE_RANKS = [
  ['S', 0.95],
  ['A', 0.85],
  ['B', 0.7],
  ['C', 0.5],
  ['D', 0],
] as const;
/** +5% for every 10 consecutive groups, capped at +50% from a 100 combo. */
export function comboMultiplier(combo: number) {
  return 1 + Math.min(10, Math.floor(Math.max(0, combo) / 10)) * 0.05;
}
export function groupPoints(
  grade: 'pureplus' | 'perfect' | 'good',
  lanes: number,
  combo: number,
) {
  return Math.round(NOTE_POINTS[grade] * lanes * comboMultiplier(combo));
}
export function scoreRank(score: number, max: number) {
  if (!max) return undefined;
  const ratio = score / max;
  return SCORE_RANKS.find(([, min]) => ratio >= min)![0];
}
export function notePosition(at: number, elapsed: number, speed = 1) {
  return (1 - ((at - elapsed) * speed) / TRAVEL_TIME) * HIT_LINE;
}
export const programs = [
  {
    id: 'random',
    name: 'Random',
    tag: 'VARIETY',
    description:
      'A fresh mix of single notes and playable chords on every run.',
  },
  {
    id: 'mixed',
    name: 'Rhythm flow',
    tag: 'BALANCED',
    description:
      'Single notes with a chord at the end of each phrase. Practice reading ahead and switching fingers.',
  },
  {
    id: 'isolation',
    name: 'Finger isolation',
    tag: 'CONTROL',
    description:
      'Four repeated notes per lane. Keep the other fingers relaxed while one finger works.',
  },
  {
    id: 'alternating',
    name: 'Alternating pairs',
    tag: 'COORDINATION',
    description:
      'Alternate between neighboring lanes in short phrases. Keep each transition even.',
  },
  {
    id: 'chords',
    name: 'Chord control',
    tag: 'INDEPENDENCE',
    description:
      'Two different fingers on every beat. Land both keys together, then release.',
  },
] as const;
export type ProgramId = (typeof programs)[number]['id'];
export function randomGroup(mapping: number[], random = Math.random) {
  const first = Math.floor(random() * 6);
  const others = [0, 1, 2, 3, 4, 5].filter(
    (n) => mapping[n] !== mapping[first],
  );
  return random() < 0.25 && others.length
    ? [first, others[Math.floor(random() * others.length)]].sort(
        (a, b) => a - b,
      )
    : [first];
}
export type Grade = 'pending' | 'perfect' | 'good' | 'miss';
export type Note = {
  id: number;
  at: number;
  lanes: number[];
  grade: Grade;
  offsets: Record<number, number>;
  judgedAt?: number;
};
export type RhythmState = {
  lives: number;
  survival: boolean;
  ended: boolean;
  bpm: number;
  mapping: number[];
  archived: {
    perfect: number;
    good: number;
    misses: number;
    early: number;
    late: number;
    sum: number;
    sumAbs: number;
    count: number;
  };
  windows: { perfect: number; good: number };
  elapsed: number;
  notes: Note[];
  held: Set<number>;
  combo: number;
  best: number;
  extras: number;
  score: number;
  pureplus: number;
  /** Highest possible score for a fixed chart; 0 for open-ended survival. */
  maxScore: number;
  feedback: string;
  lastJudgement?: {
    grade: Exclude<Grade, 'pending'> | 'extra';
    at: number;
    offset?: number;
  };
};

export function createRhythm(
  bpm: number,
  mapping: number[],
  program: ProgramId = 'mixed',
  windows = { perfect: PERFECT_WINDOW, good: HIT_WINDOW },
  lives = 0,
): RhythmState {
  const sequence = [0, 2, 1, 3, 2, 4, 3, 5, 1, 4, 0, 5];
  const pairs = [
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
  ].filter(([a, b]) => mapping[a] !== mapping[b]);
  const state: RhythmState = {
    lives,
    survival: lives > 0,
    ended: false,
    bpm,
    mapping: [...mapping],
    archived: {
      perfect: 0,
      good: 0,
      misses: 0,
      early: 0,
      late: 0,
      sum: 0,
      sumAbs: 0,
      count: 0,
    },
    windows: {
      perfect: Math.max(10, Math.min(windows.perfect, windows.good)),
      good: Math.max(10, windows.good),
    },
    elapsed: 0,
    held: new Set(),
    combo: 0,
    best: 0,
    extras: 0,
    score: 0,
    pureplus: 0,
    maxScore: 0,
    feedback: 'Get ready. Meet the notes at the line.',

    notes: Array.from({ length: 32 }, (_, i) => ({
      id: i,
      at: LEAD_IN + (i * 60000) / bpm,
      lanes:
        program === 'random' || lives > 0
          ? randomGroup(mapping)
          : program === 'isolation'
            ? [Math.floor(i / 4) % 6]
            : program === 'alternating'
              ? [(Math.floor(i / 8) % 5) + (i % 2)]
              : program === 'chords'
                ? pairs.length
                  ? [...pairs[i % pairs.length]]
                  : [sequence[i % sequence.length]]
                : i % 8 === 7 && pairs.length
                  ? [...pairs[Math.floor(i / 8) % pairs.length]]
                  : [sequence[i % sequence.length]],
      grade: 'pending',
      offsets: {},
    })),
  };
  if (!state.survival) state.maxScore = chartMaxScore(state.notes);
  return state;
}

/** Score of a flawless run: every group Pure+, combo unbroken. */
export function chartMaxScore(notes: { lanes: number[] }[]) {
  return notes.reduce(
    (sum, note, i) => sum + groupPoints('pureplus', note.lanes.length, i + 1),
    0,
  );
}

/**
 * A fixed chart from an imported song. Note times are milliseconds from the
 * start of the audio, which begins playing at the end of the lead-in.
 */
export function createRhythmFromChart(
  chart: { at: number; lanes: number[] }[],
  bpm: number,
  mapping: number[],
  windows = { perfect: PERFECT_WINDOW, good: HIT_WINDOW },
): RhythmState {
  const state = createRhythm(bpm, mapping, 'mixed', windows);
  state.notes = chart.map((note, id) => ({
    id,
    at: LEAD_IN + note.at,
    lanes: [...note.lanes],
    grade: 'pending',
    offsets: {},
  }));
  state.maxScore = chartMaxScore(state.notes);
  return state;
}

export function advanceRhythm(state: RhythmState, elapsed: number) {
  if (state.ended) return;
  state.elapsed = Math.max(state.elapsed, elapsed);
  for (const note of state.notes) {
    if (
      note.grade === 'pending' &&
      state.elapsed > note.at + state.windows.good
    ) {
      note.grade = 'miss';
      note.judgedAt = state.elapsed;
      state.combo = 0;
      state.feedback = 'Miss · keep going';
      state.lastJudgement = { grade: 'miss', at: state.elapsed };
      if (state.survival && --state.lives <= 0) {
        state.ended = true;
        break;
      }
    }
  }
  if (state.survival && !state.ended) {
    if (state.notes.filter((n) => n.grade === 'pending').length < 16) {
      const last = state.notes[state.notes.length - 1];
      for (let i = 1; i <= 32; i++)
        state.notes.push({
          id: last.id + i,
          at: last.at + (i * 60000) / state.bpm,
          lanes: randomGroup(state.mapping),
          grade: 'pending',
          offsets: {},
        });
    }
    state.notes = state.notes.filter((n) => {
      if (n.grade === 'pending' || n.at > state.elapsed - 4000) return true;
      const a = state.archived;
      if (n.grade === 'miss') a.misses++;
      else {
        a[n.grade]++;
        const offset = Object.values(n.offsets).reduce(
          (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
          0,
        );
        a.count++;
        a.sum += offset;
        a.sumAbs += Math.abs(offset);
        if (offset < 0) a.early++;
        if (offset > 0) a.late++;
      }
      return false;
    });
  }
}

export function pressRhythm(state: RhythmState, lane: number, elapsed: number) {
  advanceRhythm(state, elapsed);
  if (
    state.ended ||
    state.held.has(lane) ||
    state.notes.every((n) => n.grade !== 'pending')
  )
    return;
  state.held.add(lane);
  // The lead-in is a positioning period, not part of the scored chart.
  if (elapsed < LEAD_IN - state.windows.good) return;
  const note = state.notes.find(
    (n) =>
      n.grade === 'pending' &&
      n.lanes.includes(lane) &&
      Math.abs(n.at - elapsed) <= state.windows.good &&
      n.offsets[lane] === undefined,
  );
  if (!note) {
    state.extras++;
    state.combo = 0;
    state.feedback = 'Extra input · wait for the line';
    state.lastJudgement = { grade: 'extra', at: state.elapsed };
    if (state.survival && --state.lives <= 0) state.ended = true;

    return;
  }
  note.offsets[lane] = elapsed - note.at;
  if (
    note.lanes.every((n) => note.offsets[n] !== undefined && state.held.has(n))
  ) {
    const offset = Object.values(note.offsets).reduce(
      (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
      0,
    );
    const worst = Math.abs(offset);
    state.lastJudgement = {
      grade: worst <= state.windows.perfect ? 'perfect' : 'good',
      at: state.elapsed,
      offset,
    };
    note.grade = worst <= state.windows.perfect ? 'perfect' : 'good';
    note.judgedAt = state.elapsed;
    const plus =
      note.grade === 'perfect' &&
      worst <= Math.min(PURE_PLUS_WINDOW, state.windows.perfect);
    if (plus) state.pureplus++;
    state.combo++;
    state.best = Math.max(state.best, state.combo);
    state.score += groupPoints(
      plus ? 'pureplus' : note.grade,
      note.lanes.length,
      state.combo,
    );
    state.feedback = `${plus ? 'Pure+' : note.grade === 'perfect' ? 'Pure' : 'Far'} · ${Math.round(offset) > 0 ? '+' : ''}${Math.round(offset)} ms`;
  }
}

export function releaseRhythm(state: RhythmState, lane: number) {
  state.held.delete(lane);
  // A partial chord must be physically held; a later tap cannot reuse it.
  for (const note of state.notes)
    if (note.grade === 'pending') delete note.offsets[lane];
}

export function rhythmSummary(state: RhythmState) {
  const perfect =
    state.archived.perfect +
    state.notes.filter((n) => n.grade === 'perfect').length;
  const good =
    state.archived.good + state.notes.filter((n) => n.grade === 'good').length;
  const misses =
    state.archived.misses +
    state.notes.filter((n) => n.grade === 'miss').length;
  const judged = perfect + good + misses;
  const offsets = state.notes
    .filter((n) => n.grade === 'perfect' || n.grade === 'good')
    .map((n) =>
      Object.values(n.offsets).reduce(
        (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
        0,
      ),
    );
  return {
    early: state.archived.early + offsets.filter((n) => n < 0).length,
    late: state.archived.late + offsets.filter((n) => n > 0).length,
    meanOffset:
      offsets.length + state.archived.count
        ? Math.round(
            (state.archived.sum + offsets.reduce((a, b) => a + b, 0)) /
              (state.archived.count + offsets.length),
          )
        : 0,
    meanAbsoluteOffset:
      offsets.length + state.archived.count
        ? Math.round(
            (state.archived.sumAbs +
              offsets.reduce((a, b) => a + Math.abs(b), 0)) /
              (state.archived.count + offsets.length),
          )
        : 0,
    perfect,
    good,
    misses,
    judged,
    hits: perfect + good,
    total: state.survival ? judged : state.notes.length,
    accuracy:
      judged + state.extras
        ? Math.round(((perfect + good) / (judged + state.extras)) * 100)
        : 0,
    done: state.survival ? state.ended : judged === state.notes.length,
    combo: state.combo,
    best: state.best,
    extras: state.extras,
    score: state.score,
    pureplus: state.pureplus,
    maxScore: state.maxScore,
    rank: scoreRank(state.score, state.maxScore),
  };
}
