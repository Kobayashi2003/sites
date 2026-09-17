'use client';
import { useEffect, useState } from 'react';
import {
  laneStyle,
  usePracticeAppearance,
} from '../../features/settings/PracticeAppearance';
import s from '../../styles.module.css';

const SEEN_KEY = 'dextra-intro-seen';
const MIN_PLAY_MS = 1250;
const LEAVE_MS = 420;

/**
 * Entrance curtain: six notes land on the hit line, then the stage is
 * revealed. Plays once per browser session and never blocks input.
 */
export default function IntroCurtain({ ready }: { ready: boolean }) {
  const {
    preferences: { colors },
  } = usePracticeAppearance();
  const [phase, setPhase] = useState<'play' | 'leave' | 'done'>('play');
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* Without storage the intro simply plays each visit. */
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => setMinElapsed(true),
      seen ? 0 : reduced ? 500 : MIN_PLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (phase !== 'play' || !ready || !minElapsed) return;
    const leave = window.setTimeout(() => setPhase('leave'), 0);
    return () => window.clearTimeout(leave);
  }, [phase, ready, minElapsed]);
  // A separate effect, so entering "leave" cannot cancel its own removal.
  useEffect(() => {
    if (phase !== 'leave') return;
    const done = window.setTimeout(() => setPhase('done'), LEAVE_MS);
    return () => window.clearTimeout(done);
  }, [phase]);
  if (phase === 'done') return null;
  return (
    <div className={s.introCurtain} data-phase={phase} aria-hidden="true">
      <div className={s.introStage}>
        <div className={s.introLanes}>
          {colors.map((color, lane) => (
            <span key={lane} style={laneStyle(color)}>
              <i />
            </span>
          ))}
          <b />
        </div>
        <strong className={s.introMark}>
          DEXTRA<span> / SIX</span>
        </strong>
        <small className={s.introCaption}>Left-hand rhythm studio</small>
        <span className={s.introProgress} />
      </div>
    </div>
  );
}
