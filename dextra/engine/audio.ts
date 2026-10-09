/**
 * Song analysis and chart generation. Pure functions over mono PCM so they
 * run in the browser after decoding and in Node tests on synthetic audio.
 */

export const ANALYSIS_RATE = 22050;
const FRAME = 1024;
const HOP = 441; // 20 ms at 22.05 kHz
const BAND_EDGES = [200, 2000]; // Hz: low | mid | high
/**
 * Log-compressed flux peaks as soon as an attack enters the tail of the
 * window, so a frame's event time sits about three quarters into it.
 */
const FRAME_LEAD = (FRAME * 0.75) / HOP;
const frameTime = (frame: number, frameRate: number) =>
  (frame + FRAME_LEAD) / frameRate;

export type Band = 0 | 1 | 2;
/** `strength` is the onset's rank among the song's onsets, 0 to 1. */
export type Onset = { time: number; strength: number; band: Band };
export type SongAnalysis = {
  duration: number;
  bpm: number;
  /** Seconds from the start of the file to the first beat of the grid. */
  offset: number;
  onsets: Onset[];
  /** Onset strength per frame, kept so the grid can be re-aligned later. */
  envelope: Float32Array;
  frameRate: number;
};
export type Difficulty = 'easy' | 'normal' | 'hard';
export type ChartNote = { at: number; lanes: number[] };

export const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  /** Grid subdivision in beats. */
  step: number;
  /** Minimum onset rank (0–1) that becomes a note. */
  threshold: number;
  /** Minimum onset rank that becomes a two-key chord. */
  chord: number;
  minGap: number;
}[] = [
  {
    id: 'easy',
    label: 'Easy',
    step: 1,
    threshold: 0.35,
    chord: 1.01,
    minGap: 0.36,
  },
  {
    id: 'normal',
    label: 'Normal',
    step: 0.5,
    threshold: 0.15,
    chord: 0.9,
    minGap: 0.2,
  },
  {
    id: 'hard',
    label: 'Hard',
    step: 0.25,
    threshold: 0,
    chord: 0.78,
    minGap: 0.13,
  },
];

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

/** Half-wave rectified log-spectral flux, split into three bands. */
export function spectralFlux(samples: Float32Array, rate = ANALYSIS_RATE) {
  const frames = Math.max(0, Math.floor((samples.length - FRAME) / HOP) + 1);
  const bands = [0, 1, 2].map(() => new Float32Array(frames));
  const window = Float64Array.from(
    { length: FRAME },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1)),
  );
  const edges = BAND_EDGES.map((hz) => Math.round((hz * FRAME) / rate));
  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);
  let previous = new Float64Array(FRAME / 2);
  let current = new Float64Array(FRAME / 2);
  for (let f = 0; f < frames; f++) {
    const start = f * HOP;
    for (let i = 0; i < FRAME; i++) {
      re[i] = samples[start + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 1; k < FRAME / 2; k++) {
      current[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const rise = current[k] - previous[k];
      if (f && rise > 0)
        bands[k < edges[0] ? 0 : k < edges[1] ? 1 : 2][f] += rise;
    }
    [previous, current] = [current, previous];
  }
  return { bands, frameRate: rate / HOP };
}

function percentile(values: ArrayLike<number>, p: number) {
  const sorted = Float32Array.from(values).sort();
  return sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
    : 0;
}

/** Combined onset strength, each band scaled to its own loud level. */
export function onsetEnvelope(bands: Float32Array[]) {
  const scale = bands.map((band) => percentile(band, 0.95) || 1);
  const out = new Float32Array(bands[0].length);
  for (let f = 0; f < out.length; f++)
    out[f] =
      (bands[0][f] / scale[0] +
        bands[1][f] / scale[1] +
        bands[2][f] / scale[2]) /
      3;
  return out;
}

function sampleAt(env: Float32Array, position: number) {
  const i = Math.floor(position);
  if (i < 0 || i + 1 >= env.length) return 0;
  const t = position - i;
  return env[i] * (1 - t) + env[i + 1] * t;
}

/** Tempo from the autocorrelated envelope, weighted toward 120 BPM. */
export function estimateTempo(
  env: Float32Array,
  frameRate: number,
  min = 70,
  max = 180,
) {
  const mean = env.reduce((a, b) => a + b, 0) / (env.length || 1);
  const centered = env.map((v) => v - mean);
  const minLag = Math.floor((60 * frameRate) / max);
  const maxLag = Math.ceil((60 * frameRate) / min);
  const corr = new Float64Array(maxLag * 2 + 2);
  for (let lag = minLag; lag < corr.length; lag++) {
    let sum = 0;
    for (let i = lag; i < centered.length; i++)
      sum += centered[i] * centered[i - lag];
    corr[lag] = sum / (centered.length - lag || 1);
  }
  let best = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * frameRate) / lag;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    const score = (corr[lag] + 0.5 * (corr[lag * 2] ?? 0)) * prior;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  const [a, b, c] = [corr[best - 1], corr[best], corr[best + 1]];
  const shift = a - 2 * b + c ? (0.5 * (a - c)) / (a - 2 * b + c) : 0;
  return (60 * frameRate) / (best + Math.max(-0.5, Math.min(0.5, shift)));
}

/** Best beat phase for a fixed tempo, in seconds. */
export function alignPhase(env: Float32Array, frameRate: number, bpm: number) {
  return alignGrid(env, frameRate, bpm, 0).offset;
}

/** Refines tempo within ±spread and finds the phase whose beats land on onsets. */
export function alignGrid(
  env: Float32Array,
  frameRate: number,
  bpm: number,
  spread = 0.02,
) {
  let best = { bpm, offset: 0, score: -Infinity };
  const steps = spread ? 40 : 0;
  for (let s = -steps; s <= steps; s++) {
    const candidate = bpm * (1 + (spread * s) / (steps || 1));
    const period = (60 * frameRate) / candidate;
    for (let phase = 0; phase < period; phase += 0.5) {
      let score = 0;
      for (let p = phase; p < env.length; p += period)
        score += sampleAt(env, p);
      score /= Math.ceil((env.length - phase) / period);
      if (score > best.score)
        best = { bpm: candidate, offset: frameTime(phase, frameRate), score };
    }
  }
  return { bpm: Math.round(best.bpm * 100) / 100, offset: best.offset };
}

/** Local maxima above an adaptive threshold, labelled with their loudest band. */
export function pickOnsets(
  bands: Float32Array[],
  env: Float32Array,
  frameRate: number,
) {
  const scale = percentile(env, 0.95) || 1;
  const bandScale = bands.map((band) => percentile(band, 0.95) || 1);
  const radius = Math.round(0.06 * frameRate);
  const context = Math.round(0.25 * frameRate);
  const onsets: Onset[] = [];
  for (let f = 1; f < env.length - 1; f++) {
    const v = env[f];
    let isPeak = true;
    for (
      let k = Math.max(0, f - radius);
      k <= Math.min(env.length - 1, f + radius);
      k++
    )
      if (env[k] > v || (env[k] === v && k < f)) {
        isPeak = false;
        break;
      }
    if (!isPeak) continue;
    let local = 0;
    const from = Math.max(0, f - context);
    const to = Math.min(env.length - 1, f + context);
    for (let k = from; k <= to; k++) local += env[k];
    local /= to - from + 1;
    if (v < local * 1.3 + scale * 0.05) continue;
    const levels = bands.map((band, i) => band[f] / bandScale[i]);
    const band = levels.indexOf(Math.max(...levels)) as Band;
    onsets.push({
      time: frameTime(f, frameRate),
      strength: Math.min(1.5, v / scale),
      band,
    });
  }
  // A decaying attack leaves a weaker echo peak shortly after; drop it.
  const kept = onsets.filter(
    (onset, i) =>
      !onsets
        .slice(Math.max(0, i - 4), i)
        .some(
          (prior) =>
            onset.time - prior.time < 0.12 &&
            onset.strength < prior.strength * 0.5,
        ),
  );
  // Strength becomes a rank among the song's own onsets (0 weakest, 1
  // strongest), so difficulty thresholds mean the same in quiet and loud mixes.
  const order = kept
    .map((onset, i) => [onset.strength, i] as const)
    .sort((a, b) => a[0] - b[0]);
  const last = Math.max(1, order.length - 1);
  order.forEach(([, i], rank) => {
    kept[i] = { ...kept[i], strength: rank / last };
  });
  return kept;
}

/** Full analysis of mono PCM at {@link ANALYSIS_RATE}. */
export function analyzeSamples(
  samples: Float32Array,
  rate = ANALYSIS_RATE,
): SongAnalysis {
  const { bands, frameRate } = spectralFlux(samples, rate);
  const envelope = onsetEnvelope(bands);
  const grid = alignGrid(
    envelope,
    frameRate,
    estimateTempo(envelope, frameRate),
  );
  return {
    duration: samples.length / rate,
    ...grid,
    onsets: pickOnsets(bands, envelope, frameRate),
    envelope,
    frameRate,
  };
}

function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Low onsets favour the outer thumb/pinky keys, highs the inner fingers. */
const BAND_LANES: number[][] = [
  [5, 0],
  [1, 2, 3],
  [3, 4, 2],
];

/**
 * Snaps strong onsets to the beat grid and assigns playable lanes: no chord
 * repeats a finger, and quick successions avoid the finger just used.
 */
export function generateChart(
  analysis: Pick<SongAnalysis, 'onsets' | 'duration'>,
  options: {
    bpm: number;
    offset: number;
    difficulty: Difficulty;
    mapping: number[];
    seed?: number;
  },
): ChartNote[] {
  const level =
    DIFFICULTIES.find((d) => d.id === options.difficulty) ?? DIFFICULTIES[1];
  const beat = 60 / options.bpm;
  const step = beat * level.step;
  const minGap = Math.max(level.minGap, step * 0.9);
  const slots = new Map<number, Onset>();
  for (const onset of analysis.onsets) {
    if (onset.strength < level.threshold) continue;
    const slot = Math.round((onset.time - options.offset) / step);
    const snapped = options.offset + slot * step;
    if (snapped < 0 || snapped > analysis.duration) continue;
    if (Math.abs(onset.time - snapped) > Math.min(step * 0.35, 0.12)) continue;
    const held = slots.get(slot);
    if (!held || onset.strength > held.strength) slots.set(slot, onset);
  }
  const picked: { time: number; onset: Onset }[] = [];
  for (const [slot, onset] of [...slots].sort((a, b) => a[0] - b[0])) {
    const time = options.offset + slot * step;
    const last = picked.at(-1);
    if (last && time - last.time < minGap - 1e-6) {
      if (onset.strength > last.onset.strength)
        picked[picked.length - 1] = { time, onset };
      continue;
    }
    picked.push({ time, onset });
  }
  const random = seeded(
    options.seed ?? Math.round(analysis.duration * 1000) + level.step * 7919,
  );
  const mapping = options.mapping;
  const recent: number[] = [];
  let lastFinger = -1;
  let lastTime = -Infinity;
  return picked.map(({ time, onset }) => {
    const quick = time - lastTime < 0.26;
    const score = (lane: number) =>
      (lane === recent.at(-1) ? -3 : 0) -
      recent.filter((l) => l === lane).length * 0.6 -
      (quick && mapping[lane] === lastFinger ? 5 : 0) +
      random() * 1.2;
    const pool = BAND_LANES[onset.band];
    const first = [...pool].sort((a, b) => score(b) - score(a))[0];
    const lanes = [first];
    if (onset.strength >= level.chord) {
      const partner = [0, 1, 2, 3, 4, 5]
        .filter(
          (l) =>
            mapping[l] !== mapping[first] &&
            !(quick && mapping[l] === lastFinger),
        )
        .sort(
          (a, b) =>
            score(b) +
            (pool.includes(b) ? -1 : 0) -
            (score(a) + (pool.includes(a) ? -1 : 0)),
        )[0];
      if (partner !== undefined) lanes.push(partner);
    }
    lanes.sort((a, b) => a - b);
    recent.push(...lanes);
    if (recent.length > 6) recent.splice(0, recent.length - 6);
    lastFinger = mapping[first];
    lastTime = time;
    return { at: Math.round(time * 1000), lanes };
  });
}
