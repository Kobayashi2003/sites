import { useEffect, useRef, useState } from 'react';
import {
  CALIBRATION_BEATS,
  CALIBRATION_WARMUP,
  estimateOffset,
} from '../engine/calibration';
import type { Calibration as Estimate } from '../engine/calibration';
import { OFFSET_LIMIT } from '../model/settings';
import ui from '../styles.module.css';
import st from './setup.module.css';

const INTERVAL = 0.6;
const LEAD = 0.5;

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; beat: number }
  | { kind: 'done'; estimate: Estimate | null };

/**
 * Plays clicks and records taps on any key. The median gap between hearing a
 * click and tapping becomes the song audio offset.
 */
export default function Calibration({
  offset,
  onApply,
}: {
  offset: number;
  onApply: (offset: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState('');
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);

  async function start() {
    stop.current();
    setError('');
    let context: AudioContext;
    try {
      context = new AudioContext({ latencyHint: 'interactive' });
      await context.resume();
    } catch {
      setError(
        'Audio could not start in this browser, so the test cannot run.',
      );
      return;
    }
    const first = context.currentTime + LEAD;
    const stamp = context.getOutputTimestamp?.();
    // Map audio time to the page clock key events use, including output delay.
    const toPage = (t: number) =>
      stamp?.contextTime !== undefined && stamp.performanceTime !== undefined
        ? stamp.performanceTime + (t - stamp.contextTime) * 1000
        : performance.now() +
          (t - context.currentTime + (context.outputLatency || 0)) * 1000;
    const beats: number[] = [];
    for (let i = 0; i < CALIBRATION_BEATS; i++) {
      const at = first + i * INTERVAL;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = i % 4 === 0 ? 1320 : 990;
      osc.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.25, at + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
      osc.start(at);
      osc.stop(at + 0.07);
      beats.push(toPage(at));
    }
    const taps: number[] = [];
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.code === 'Escape' || e.code === 'Tab') return;
      e.preventDefault();
      taps.push(e.timeStamp);
    };
    window.addEventListener('keydown', down);
    const timers = beats.map((_, i) =>
      window.setTimeout(
        () => setPhase({ kind: 'running', beat: i + 1 }),
        (LEAD + i * INTERVAL) * 1000,
      ),
    );
    const finish = window.setTimeout(
      () => {
        cleanup();
        const counted = beats.slice(CALIBRATION_WARMUP);
        // Taps more than half a beat before the first counted click are warm-up.
        const from = counted[0] - (INTERVAL * 1000) / 2;
        setPhase({
          kind: 'done',
          estimate: estimateOffset(
            taps.filter((t) => t >= from),
            counted,
          ),
        });
      },
      (LEAD + CALIBRATION_BEATS * INTERVAL) * 1000,
    );
    function cleanup() {
      window.removeEventListener('keydown', down);
      timers.forEach(clearTimeout);
      clearTimeout(finish);
      void context.close().catch(() => {});
    }
    stop.current = () => {
      cleanup();
      setPhase({ kind: 'idle' });
    };
    setPhase({ kind: 'running', beat: 0 });
  }

  const estimate = phase.kind === 'done' ? phase.estimate : null;
  const clamped = estimate
    ? Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, estimate.offset))
    : 0;

  return (
    <div className={st.calibration}>
      <p>
        Twelve clicks play. Ignore the first four, then tap any key on each
        click. Headphones give the most accurate result.
      </p>
      <div
        className={st.beats}
        aria-hidden="true"
        data-running={phase.kind === 'running' || undefined}
      >
        {Array.from({ length: CALIBRATION_BEATS }, (_, i) => (
          <i
            key={i}
            data-warmup={i < CALIBRATION_WARMUP || undefined}
            data-past={
              (phase.kind === 'running' && i < phase.beat) || undefined
            }
            data-now={
              (phase.kind === 'running' && i === phase.beat - 1) || undefined
            }
          />
        ))}
      </div>
      <div aria-live="polite" className={st.calibrationResult}>
        {phase.kind === 'running' &&
          (phase.beat <= CALIBRATION_WARMUP
            ? 'Listen to the pulse…'
            : 'Tap on each click.')}
        {phase.kind === 'done' &&
          (estimate ? (
            <p>
              Your taps land{' '}
              <strong>
                {Math.abs(estimate.offset)} ms{' '}
                {estimate.offset >= 0 ? 'after' : 'before'}
              </strong>{' '}
              the click, steady to within {estimate.spread} ms across{' '}
              {estimate.taps} taps.
            </p>
          ) : (
            <p>
              Too few taps landed near a click. Try again and tap on every click
              after the first four.
            </p>
          ))}
        {error && <p>{error}</p>}
      </div>
      <div className={st.calibrationActions}>
        {phase.kind === 'running' ? (
          <button
            type="button"
            className={ui.button}
            onClick={() => stop.current()}
          >
            Stop the test
          </button>
        ) : (
          <button
            type="button"
            className={ui.button}
            onClick={() => void start()}
          >
            {phase.kind === 'done'
              ? 'Run the test again'
              : 'Start the tap test'}
          </button>
        )}
        {estimate && clamped !== offset && (
          <button
            type="button"
            className={ui.primary}
            onClick={() => onApply(clamped)}
          >
            Set audio offset to {clamped > 0 ? '+' : ''}
            {clamped} ms
          </button>
        )}
        {estimate && clamped === offset && (
          <span className={ui.fieldHint}>
            Your audio offset already matches.
          </span>
        )}
      </div>
    </div>
  );
}
