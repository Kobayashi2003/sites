'use client';
import { useKeyAudio } from '../../hooks/useKeyAudio';
import {
  usePracticeAppearance,
  laneStyle,
} from '../settings/PracticeAppearance';
import { useEffect, useRef, useState } from 'react';
import {
  createStatic,
  pressStatic,
  releaseStatic,
  staticSummary,
} from '../../engine/static';
import { programs, createRhythm, randomGroup } from '../../engine/rhythm';
import type { ProgramId } from '../../engine/rhythm';
import { keyLabel } from '../../model/training';
import type { Result, Status } from '../../model/training';
import Icon from '../../components/ui/Icon';
import { StageControls } from '../../components/workspace/StageContext';
import s from '../../styles.module.css';
function newRun(mapping: number[], program: ProgramId) {
  return createStatic(
    createRhythm(60, mapping, program).notes.map((n) => n.lanes),
  );
}
export default function StaticTrainer({
  keys,
  mapping,
  program,
  direction,
  status,
  onStatus,
  onComplete,
  challenge,
  limit,
}: {
  keys: string[];
  mapping: number[];
  program: ProgramId;
  direction: 'down' | 'up';
  status: Status;
  onStatus: (s: Status) => void;
  onComplete: (r: Result) => void;
  challenge: 'standard' | 'endless';
  limit: number;
}) {
  const {
    preferences: { colors },
  } = usePracticeAppearance();
  const keyAudioNotice = useKeyAudio(status, keys);
  const [view, setView] = useState(() =>
    newRun(mapping, challenge === 'endless' ? 'random' : program),
  );
  const engine = useRef(view);
  const origin = useRef(0),
    reported = useRef(false);
  const endless = challenge === 'endless';
  useEffect(() => {
    if (status !== 'idle') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        const next = newRun(mapping, endless ? 'random' : program);
        engine.current = next;
        setView(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, mapping, program, endless]);
  useEffect(() => {
    if (status !== 'running') return;
    const state = engine.current;
    origin.current = performance.now() - state.elapsed;
    let frame = 0;
    function finish() {
      if (reported.current) return;
      reported.current = true;
      const errorRate = staticSummary(state).errorRate;
      onComplete({
        date: new Date().toISOString(),
        mode: programs.find((p) => p.id === (endless ? 'random' : program))!
          .name,
        format: 'static',
        direction,
        challenge,
        limit,
        bpm: 0,
        hits: state.index,
        total: endless ? state.index : state.groups.length,
        accuracy: state.presses ? Math.round((100 - errorRate) * 10) / 10 : 0,
        durationMs: state.elapsed,
        errors: state.errors,
        errorRate,
      });
      onStatus('done');
    }
    function update() {
      state.elapsed = Math.min(
        endless ? limit * 1000 : Infinity,
        performance.now() - origin.current,
      );
      if (endless && state.elapsed >= limit * 1000) {
        finish();
        return false;
      }
      return true;
    }
    const tick = () => {
      if (!update()) return;
      setView({ ...state, held: new Set(state.held) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onStatus('paused');
        return;
      }
      const lane = keys.indexOf(e.code);
      if (
        lane < 0 ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      e.preventDefault();
      if (e.repeat || !update()) return;
      pressStatic(state, lane);
      if (endless && state.groups.length - state.index < 16)
        for (let i = 0; i < 32; i++) state.groups.push(randomGroup(mapping));
      if (!endless && staticSummary(state).done) finish();
      setView({ ...state, held: new Set(state.held) });
    };
    const up = (e: KeyboardEvent) => releaseStatic(state, keys.indexOf(e.code));
    const pause = () => onStatus('paused');
    const visibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      if (!reported.current)
        state.elapsed = Math.min(
          endless ? limit * 1000 : Infinity,
          performance.now() - origin.current,
        );
      state.held.clear();
      state.matched.clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [
    status,
    keys,
    mapping,
    program,
    direction,
    onStatus,
    onComplete,
    endless,
    limit,
    challenge,
  ]);
  const page = Math.floor(Math.min(view.index, view.groups.length - 1) / 8);
  function play() {
    if (status === 'running') onStatus('paused');
    else if (status === 'paused') onStatus('running');
    else {
      engine.current = newRun(mapping, endless ? 'random' : program);
      reported.current = false;
      setView(engine.current);
      onStatus('running');
    }
  }
  const label =
    status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';
  const time = (
    endless ? Math.max(0, limit - view.elapsed / 1000) : view.elapsed / 1000
  ).toFixed(2);
  return (
    <section className={s.workbench} aria-label="Static practice">
      <StageControls>
        <div className={s.controls}>
          <div className={s.staticClock}>
            <Icon name="clock" />
            <strong>{time}s</strong>
            <span>{endless ? 'Remaining' : 'Active time'}</span>
          </div>
          <StageControls slot="playback">
            <div className={s.playButtons}>
              <button className={s.startButton} onClick={play}>
                <Icon name={status === 'running' ? 'pause' : 'play'} />
                {label}
              </button>
              <button
                className={s.endButton}
                disabled={status !== 'running' && status !== 'paused'}
                onClick={() => onStatus('idle')}
              >
                <Icon name="stop" />
                End
              </button>
            </div>
          </StageControls>
        </div>
        {keyAudioNotice && (
          <output className={s.motionNote}>{keyAudioNotice}</output>
        )}
        <div className={s.staticReadout}>
          <span>
            {view.index}
            {endless ? ' groups' : ' / 32 groups'}
          </span>
          <span>
            {status === 'paused'
              ? 'Paused'
              : direction === 'down'
                ? 'Next row at the bottom'
                : 'Next row at the top'}
          </span>
        </div>
      </StageControls>
      <div
        className={s.staticChart}
        data-direction={direction}
        aria-label="Stationary six-lane chart"
      >
        <div className={s.staticKeys}>
          {keys.map((key, i) => (
            <span key={i} style={laneStyle(colors[i])}>
              {keyLabel(key)}
            </span>
          ))}
        </div>
        {Array.from({ length: 8 }, (_, i) =>
          direction === 'down' ? 7 - i : i,
        ).map((i) => {
          const index = page * 8 + i;
          const group = view.groups[index];
          return (
            <div
              key={index}
              className={s.staticRow}
              data-current={index === view.index}
              data-done={index < view.index}
              data-future={index > view.index}
              aria-label={`Row ${index + 1}${index === view.index ? ', current' : ''}`}
            >
              {keys.map((_, lane) => (
                <span
                  key={lane}
                  style={laneStyle(colors[lane])}
                  data-held={status === 'running' && view.held.has(lane)}
                >
                  {group?.includes(lane) && <i />}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
