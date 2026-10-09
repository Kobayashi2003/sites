'use client';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Ref } from 'react';
import {
  createStatic,
  pressStatic,
  releaseStatic,
  staticSummary,
} from '../engine/static';
import type { StaticState } from '../engine/static';
import { createRhythm, randomGroup } from '../engine/rhythm';
import { useKeyAudio } from '../hooks/useKeyAudio';
import { laneStyle } from '../ui/Keycap';
import { activeProgram, staticResult, typingInto } from './session';
import type { StageHandle, StageProps } from './session';
import { Display, KeyRow, Overlay } from './StageParts';
import p from './practice.module.css';

const ROWS = 8;
const clone = (state: StaticState): StaticState => ({
  ...state,
  held: new Set(state.held),
});

export default function StaticStage({
  settings,
  status,
  title,
  onStatus,
  onComplete,
  ref,
}: StageProps & { ref: Ref<StageHandle> }) {
  const { keys, mapping, colors, direction, challenge, timeLimit } = settings;
  const program = activeProgram(settings);
  const endless = challenge === 'endless';
  const limit = timeLimit * 1000;
  const keyAudioNotice = useKeyAudio(
    settings.keySound,
    status === 'running',
    keys,
  );
  const build = useCallback(
    () =>
      createStatic(
        createRhythm(60, mapping, program).notes.map((n) => n.lanes),
      ),
    [mapping, program],
  );
  const preview = useMemo(() => build(), [build]);
  const [live, setLive] = useState<StaticState | null>(null);
  const engine = useRef<StaticState | null>(null);
  /** performance.now() at elapsed 0, or null until the first press. */
  const origin = useRef<number | null>(null);
  const reported = useRef(false);
  const view = status === 'idle' || !live ? preview : live;

  const latest = useRef({ settings, onComplete, onStatus });
  useEffect(() => {
    latest.current = { settings, onComplete, onStatus };
  });

  useImperativeHandle(
    ref,
    () => ({
      start() {
        const state = build();
        engine.current = state;
        origin.current = null;
        reported.current = false;
        setLive(clone(state));
        onStatus('running');
      },
    }),
    [build, onStatus],
  );

  useEffect(() => {
    const state = engine.current;
    if (status !== 'running' || !state) return;
    // Resuming continues the clock from where the pause left it.
    if (origin.current !== null)
      origin.current = performance.now() - state.elapsed;
    const finish = () => {
      if (reported.current) return;
      reported.current = true;
      const { settings, onComplete } = latest.current;
      onComplete(staticResult(state, settings));
    };
    const tick = () => {
      if (origin.current === null) return true;
      state.elapsed = Math.min(
        endless ? limit : Infinity,
        performance.now() - origin.current,
      );
      if (endless && state.elapsed >= limit) {
        finish();
        return false;
      }
      return true;
    };
    let frame = 0;
    const loop = () => {
      if (!tick()) return;
      setLive(clone(state));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        latest.current.onStatus('paused');
        return;
      }
      const lane = keys.indexOf(e.code);
      if (lane < 0 || typingInto(e.target)) return;
      e.preventDefault();
      if (e.repeat) return;
      origin.current ??= performance.now();
      if (!tick()) return;
      pressStatic(state, lane);
      if (endless && state.groups.length - state.index < 16)
        for (let i = 0; i < 32; i++) state.groups.push(randomGroup(mapping));
      if (!endless && staticSummary(state).done) finish();
      setLive(clone(state));
    };
    const up = (e: KeyboardEvent) => {
      const lane = keys.indexOf(e.code);
      if (lane >= 0) releaseStatic(state, lane);
    };
    const pause = () => latest.current.onStatus('paused');
    const hidden = () => document.hidden && pause();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      cancelAnimationFrame(frame);
      if (!reported.current) tick();
      state.held.clear();
      state.matched.clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [status, keys, mapping, endless, limit]);

  const summary = staticSummary(view);
  const started = status !== 'idle' && view.presses > 0;
  const seconds = (endless ? limit - view.elapsed : view.elapsed) / 1000;
  const page = Math.floor(Math.min(view.index, view.groups.length - 1) / ROWS);
  const rows = Array.from({ length: ROWS }, (_, i) =>
    direction === 'down' ? ROWS - 1 - i : i,
  );

  return (
    <section
      className={p.stage}
      aria-label="Static chart"
      data-direction={direction}
    >
      <div className={p.hud} aria-label="Run status">
        <div className={p.hudMain}>
          <span className={p.hudLabel}>
            {endless ? 'Time left' : 'Active time'}
          </span>
          <strong className={p.score}>
            {Math.max(0, seconds).toFixed(2)}
            <small> s</small>
          </strong>
        </div>
        <div>
          <span className={p.hudLabel}>Groups</span>
          <strong>
            {view.index}
            {!endless && <small> of {view.groups.length}</small>}
          </strong>
        </div>
        <div>
          <span className={p.hudLabel}>Accuracy</span>
          <strong>
            {view.presses ? `${Math.round(100 - summary.errorRate)}%` : '–'}
          </strong>
        </div>
      </div>

      <Display
        progress={
          endless
            ? started
              ? view.elapsed / limit
              : 0
            : view.index / view.groups.length
        }
      >
        <div className={p.staticGrid} aria-hidden="true">
          {rows.map((i) => {
            const index = page * ROWS + i;
            const group = view.groups[index];
            return (
              <div
                key={index}
                className={p.staticRow}
                data-state={
                  index === view.index
                    ? 'current'
                    : index < view.index
                      ? 'done'
                      : 'ahead'
                }
              >
                {keys.map((code, lane) => (
                  <span
                    key={code}
                    style={laneStyle(colors[lane])}
                    data-held={
                      (status === 'running' && view.held.has(lane)) || undefined
                    }
                  >
                    {group?.includes(lane) && <b className={p.note} />}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        {status === 'idle' && (
          <Overlay>
            <p className={p.overlayTitle}>{title}</p>
            <p>
              {endless
                ? `Clear as many groups as you can in ${timeLimit} seconds. Nothing moves; only accuracy and pace count.`
                : `Play all ${view.groups.length} groups at your own pace. The clock starts on your first press.`}
            </p>
            <p className={p.overlayHint}>
              Press <kbd>Enter</kbd> to begin.
            </p>
          </Overlay>
        )}
        {status === 'running' && !started && (
          <Overlay quiet>
            <p className={p.overlayHint}>The clock starts on your first key.</p>
          </Overlay>
        )}
        {status === 'paused' && (
          <Overlay>
            <p className={p.overlayTitle}>Paused</p>
            <p className={p.overlayHint}>
              The clock is stopped. <kbd>Enter</kbd> resumes.
            </p>
          </Overlay>
        )}
      </Display>

      <KeyRow
        keys={keys}
        mapping={mapping}
        colors={colors}
        held={status === 'running' ? view.held : undefined}
      />
      <p className={p.stageNote} aria-live="polite">
        {keyAudioNotice ||
          (direction === 'down'
            ? 'The current row is the lowest lit row.'
            : 'The current row is the highest lit row.')}
      </p>
    </section>
  );
}
