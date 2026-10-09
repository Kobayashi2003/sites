import { LEAD_IN, programs, rhythmSummary } from '../engine/rhythm';
import type { ProgramId, RhythmState } from '../engine/rhythm';
import type { ChartNote, Difficulty } from '../engine/audio';
import type { StaticState } from '../engine/static';
import { staticSummary } from '../engine/static';
import type { LaneResult, Result, Status } from '../model/training';
import type { Settings } from '../model/settings';

/** An imported song with its generated chart, ready to play. */
export type SongSession = {
  id: string;
  name: string;
  duration: number;
  bpm: number;
  difficulty: Difficulty;
  notes: ChartNote[];
  buffer: AudioBuffer;
};

export type StageProps = {
  settings: Settings;
  song: SongSession | null;
  status: Status;
  title: string;
  onStatus: (status: Status) => void;
  onComplete: (result: Result) => void;
};

/** What the console asks of whichever stage is showing. */
export type StageHandle = { start: () => void };

/** Survival always draws random groups; standard plays the chosen plan. */
export const activeProgram = (s: Settings): ProgramId =>
  s.challenge === 'endless' ? 'random' : s.program;
export const programName = (id: ProgramId) =>
  programs.find((p) => p.id === id)!.name;

export function fallingResult(
  state: RhythmState,
  settings: Settings,
  song: SongSession | null,
): Result {
  const summary = rhythmSummary(state);
  const lanes: LaneResult[] = summary.lanes.map((lane) => ({
    hits: lane.perfect + lane.good,
    misses: lane.miss,
    extras: lane.extra,
    meanOffset: lane.offsetCount
      ? Math.round(lane.offsetSum / lane.offsetCount)
      : null,
  }));
  return {
    date: new Date().toISOString(),
    mode: song ? song.name : programName(activeProgram(settings)),
    songId: song?.id,
    difficulty: song?.difficulty,
    accuracy: summary.accuracy,
    hits: summary.hits,
    total: summary.total,
    lanes,
    judgements: {
      perfect: summary.perfect,
      good: summary.good,
      misses: summary.misses,
      extras: summary.extras,
      best: summary.best,
      early: summary.early,
      late: summary.late,
      meanOffset: summary.meanOffset,
      meanAbsoluteOffset: summary.meanAbsoluteOffset,
      pureplus: summary.pureplus,
    },
    score: summary.score,
    maxScore: summary.maxScore || undefined,
    rank: summary.rank,
    bpm: song ? Math.round(song.bpm) : settings.bpm,
    format: 'falling',
    challenge: song ? 'standard' : settings.challenge,
    limit: settings.lives,
    durationMs: Math.max(0, state.elapsed - LEAD_IN),
    direction: settings.direction,
    windows: state.windows,
  };
}

export function staticResult(state: StaticState, settings: Settings): Result {
  const { errorRate } = staticSummary(state);
  const endless = settings.challenge === 'endless';
  return {
    date: new Date().toISOString(),
    mode: programName(activeProgram(settings)),
    format: 'static',
    direction: settings.direction,
    challenge: settings.challenge,
    limit: settings.timeLimit,
    bpm: 0,
    hits: state.index,
    total: endless ? state.index : state.groups.length,
    accuracy: state.presses ? Math.round((100 - errorRate) * 10) / 10 : 0,
    durationMs: state.elapsed,
    errors: state.errors,
    errorRate,
    lanes: state.laneHits.map((hits, lane) => ({
      hits,
      misses: 0,
      extras: state.laneErrors[lane],
      meanOffset: null,
    })),
  };
}

export const clockText = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Keydowns aimed at a form control belong to that control, not the chart. */
export const typingInto = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement;
