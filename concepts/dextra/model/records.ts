import type { HanonConfig } from '../engine/hanon';

/** Only settings that affect the exercise or its difficulty; appearance is excluded. */
export type RecordConfiguration = {
  version: 1;
  exercise: string;
  format: 'falling' | 'static';
  challenge: 'standard' | 'endless';
  direction: 'up' | 'down';
  keys: string[];
  mapping: number[];
  bpm: number;
  limit: number;
  windows: { perfect: number; good: number };
  hanon?: HanonConfig;
  song?: {
    id: string;
    difficulty: 'easy' | 'normal' | 'hard';
    gridOffset: number;
    audioOffset: number;
    chart: string;
  };
};
