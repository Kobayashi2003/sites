'use client';
import { useKeyAudio } from '../../hooks/useKeyAudio';
import {
  usePracticeAppearance,
  laneStyle,
} from '../settings/PracticeAppearance';

import { useEffect, useRef, useState } from 'react';
import {
  advanceRhythm,
  comboMultiplier,
  programs,
  createRhythm,
  HIT_LINE,
  notePosition,
  LEAD_IN,
  PURE_PLUS_WINDOW,
  pressRhythm,
  releaseRhythm,
  rhythmSummary,
  TRAVEL_TIME,
} from '../../engine/rhythm';
import type { RhythmState, ProgramId } from '../../engine/rhythm';
import { StageControls } from '../../components/workspace/StageContext';
import Icon from '../../components/ui/Icon';
import LifeMeter from '../../components/ui/LifeMeter';
import s from '../../styles.module.css';
import { fingers, keyLabel } from '../../model/training';
import type { Status, Result } from '../../model/training';

type Props = {
  direction: 'down' | 'up';
  challenge: 'standard' | 'endless';
  limit: number;
  initialBpm: number;
  program: ProgramId;
  windows: { perfect: number; good: number };
  keys: string[];
  mapping: number[];
  status: Status;
  onStatus: (status: Status) => void;
  onComplete: (result: Result) => void;
};
export default function FallingTrainer({
  program,
  challenge,
  limit,
  initialBpm,
  direction,
  windows,
  keys,
  mapping,
  status,
  onStatus,
  onComplete,
}: Props) {
  const {
    preferences: { colors },
  } = usePracticeAppearance();
  const keyAudioNotice = useKeyAudio(status, keys);
  const [bpm, setBpm] = useState(initialBpm);
  const [speed, setSpeed] = useState(1);
  const [showWindow, setShowWindow] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const displaySettings = useRef<HTMLDetailsElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const [view, setView] = useState(() =>
    createRhythm(
      initialBpm,
      mapping,
      program,
      windows,
      challenge === 'endless' ? limit : 0,
    ),
  );
  const engine = useRef<RhythmState | null>(status === 'running' ? view : null);
  const startButton = useRef<HTMLButtonElement>(null);
  const origin = useRef(0);
  const completed = useRef(false);
  const busy = status === 'running' || status === 'paused';
  const stats = rhythmSummary(view);
  const next = view.notes.find((n) => n.grade === 'pending');
  const displaySpeed = reduced ? 1 : speed;
  const travelTime = TRAVEL_TIME / displaySpeed;
  const displayTime =
    status === 'idle' ? LEAD_IN - travelTime * 0.25 : view.elapsed;
  const latest = view.notes
    .filter((n) => n.judgedAt !== undefined)
    .reduce<(typeof view.notes)[number] | undefined>(
      (last, note) => (!last || note.judgedAt! >= last.judgedAt! ? note : last),
      undefined,
    );
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(
          localStorage.getItem('dextra-chart-v2') || 'null',
        );
        if (saved && typeof saved === 'object') {
          if (
            Number.isFinite(saved.speed) &&
            saved.speed >= 0.5 &&
            saved.speed <= 4
          )
            setSpeed(saved.speed);
          if (typeof saved.showWindow === 'boolean')
            setShowWindow(saved.showWindow);
        }
      } catch {
        /* Display preferences are optional. */
      }
      setPreferencesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (preferencesReady)
      try {
        localStorage.setItem(
          'dextra-chart-v2',
          JSON.stringify({ speed, showWindow }),
        );
      } catch {
        /* Practice works without storage. */
      }
  }, [preferencesReady, speed, showWindow]);

  useEffect(() => {
    if (status !== 'idle') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        engine.current = null;
        setView(
          createRhythm(
            bpm,
            mapping,
            program,
            windows,
            challenge === 'endless' ? limit : 0,
          ),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, bpm, mapping, program, windows, challenge, limit]);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    queueMicrotask(update);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (status !== 'running' || !engine.current) return;
    const state = engine.current;
    origin.current = performance.now() - state.elapsed;
    let frame = 0;
    function render() {
      advanceRhythm(state, performance.now() - origin.current);
      setView({
        ...state,
        held: new Set(state.held),
        notes: state.notes.map((n) => ({ ...n })),
      });
      const result = rhythmSummary(state);
      if (result.done) {
        if (!completed.current) {
          completed.current = true;
          onComplete({
            date: new Date().toISOString(),
            mode: programs.find((p) => p.id === program)!.name,
            accuracy: result.accuracy,
            hits: result.hits,
            total: result.total,
            judgements: {
              perfect: result.perfect,
              good: result.good,
              misses: result.misses,
              extras: result.extras,
              best: result.best,
              early: result.early,
              late: result.late,
              meanOffset: result.meanOffset,
              meanAbsoluteOffset: result.meanAbsoluteOffset,
              pureplus: result.pureplus,
            },
            score: result.score,
            maxScore: result.maxScore || undefined,
            rank: result.rank,
            bpm,
            format: 'falling',
            challenge,
            limit,
            durationMs: Math.max(0, state.elapsed - LEAD_IN),
            direction,
            windows: state.windows,
          });
          onStatus('done');
        }
      } else frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      advanceRhythm(state, performance.now() - origin.current);
      state.held.clear();
      for (const note of state.notes)
        if (note.grade === 'pending') note.offsets = {};
    };
  }, [status, bpm, program, direction, challenge, limit, onStatus, onComplete]);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (status !== 'running') return;
      if (e.code === 'Escape') {
        onStatus('paused');
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      const lane = keys.indexOf(e.code);
      if (lane < 0) return;
      e.preventDefault();
      if (!e.repeat && engine.current)
        pressRhythm(engine.current, lane, performance.now() - origin.current);
    }
    function up(e: KeyboardEvent) {
      if (engine.current) releaseRhythm(engine.current, keys.indexOf(e.code));
    }
    function pause() {
      if (status === 'running') onStatus('paused');
    }
    function visibility() {
      if (document.hidden) pause();
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [status, keys, onStatus]);

  function togglePlayback() {
    if (status === 'running') onStatus('paused');
    else if (status === 'paused') {
      if (displaySettings.current) displaySettings.current.open = false;
      onStatus('running');
    } else start();
  }

  function start() {
    if (displaySettings.current) displaySettings.current.open = false;
    const state = createRhythm(
      bpm,
      mapping,
      program,
      windows,
      challenge === 'endless' ? limit : 0,
    );
    engine.current = state;
    completed.current = false;
    setView(state);
    onStatus('running');
  }

  return (
    <section
      className={s.workbench}
      aria-label="Falling notes studio"
      data-display-ready={preferencesReady}
    >
      <StageControls>
        <section className={s.panelSection} aria-labelledby="panel-tempo">
          <h3 className={s.panelHeading} id="panel-tempo">
            Tempo
          </h3>
          <div className={s.tempo}>
            <label htmlFor="falling-tempo">
              <span>BPM</span>
              <strong>{bpm}</strong>
            </label>
            <input
              id="falling-tempo"
              type="range"
              min="30"
              max="150"
              step="5"
              value={bpm}
              disabled={busy}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
          </div>
          <div className={s.quickSpeed}>
            <span>Scroll speed</span>
            <div className={s.stepper}>
              <button
                aria-label="Decrease scroll speed"
                disabled={reduced || speed <= 0.5}
                onClick={() => {
                  if (status === 'running') onStatus('paused');
                  setSpeed((v) => Math.max(0.5, v - 0.25));
                }}
              >
                −
              </button>
              <output>{speed.toFixed(2)}×</output>
              <button
                aria-label="Increase scroll speed"
                disabled={reduced || speed >= 4}
                onClick={() => {
                  if (status === 'running') onStatus('paused');
                  setSpeed((v) => Math.min(4, v + 0.25));
                }}
              >
                +
              </button>
            </div>
          </div>
          {reduced && (
            <p className={s.motionNote}>
              Reduced motion: fixed note previews. Press when the countdown
              reaches zero.
            </p>
          )}
        </section>
        <details
          ref={displaySettings}
          className={s.chartSettings}
          onToggle={(e) => {
            if (e.currentTarget.open && status === 'running')
              onStatus('paused');
          }}
        >
          <summary>
            <span>Display</span>
            <span>
              {reduced ? 'Fixed' : `${speed.toFixed(2)}×`} · Window{' '}
              {showWindow ? 'on' : 'off'}
              <b aria-hidden="true">⌄</b>
            </span>
          </summary>
          <div className={s.chartSettingsBody}>
            <div className={s.chartSetting}>
              <label htmlFor="chart-speed">
                Scroll speed <strong>{speed.toFixed(2)}×</strong>
              </label>
              <input
                id="chart-speed"
                type="range"
                min="0.5"
                max="4"
                step="0.25"
                value={speed}
                disabled={reduced}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
              <div className={s.speedPresets}>
                {[1, 1.5, 2, 3].map((value) => (
                  <button
                    key={value}
                    disabled={reduced}
                    aria-pressed={speed === value}
                    onClick={() => setSpeed(value)}
                  >
                    {value}×
                  </button>
                ))}
              </div>
              <p>
                {reduced
                  ? 'Fixed previews are enabled by reduced motion.'
                  : `${(travelTime / 1000).toFixed(2)}s visible ahead. Higher speed gives less reading time.`}
              </p>
            </div>
            <div className={s.chartSetting}>
              <label className={s.windowToggle}>
                <input
                  type="checkbox"
                  checked={showWindow}
                  onChange={(e) => setShowWindow(e.target.checked)}
                />
                Show hit window
              </label>
              <p>
                The outer band marks Far; the inner band marks Pure. Aim for the
                center line for Pure+.
              </p>
              <p>
                Display settings never change BPM or scoring. Opening this panel
                pauses your session.
              </p>
            </div>
          </div>
        </details>
        <StageControls slot="status">
          <div className={s.sessionCard} data-state={status}>
            <div className={s.sessionHead}>
              <strong aria-live="polite">
                {status === 'idle'
                  ? 'Ready'
                  : status === 'paused'
                    ? 'Paused'
                    : status === 'done'
                      ? 'Complete'
                      : view.elapsed < LEAD_IN
                        ? `Starting in ${Math.ceil((LEAD_IN - view.elapsed) / 1000)}`
                        : 'Playing'}
              </strong>
              <span>
                {challenge === 'endless'
                  ? `${stats.judged} groups`
                  : `${stats.judged} / 32`}
              </span>
            </div>
            {challenge === 'endless' ? (
              <div className={s.sessionMeter}>
                <LifeMeter lives={view.lives} limit={limit} />
                <span>Miss or Extra costs a life</span>
              </div>
            ) : (
              <div className={s.sessionMeter}>
                <progress
                  max={32}
                  value={stats.judged}
                  aria-label="Chart progress"
                />
                <span>
                  Phrase {Math.min(4, Math.floor(stats.judged / 8) + 1)} of 4
                </span>
              </div>
            )}
            <p className={s.sessionHint}>
              {status === 'paused'
                ? 'Resume continues from the same beat.'
                : status === 'running'
                  ? 'Esc pauses the run.'
                  : '3s lead-in before the first note.'}
            </p>
          </div>
        </StageControls>
        <StageControls slot="playback">
          <div className={s.playButtons}>
            <button
              ref={startButton}
              className={s.startButton}
              onClick={togglePlayback}
            >
              <Icon name={status === 'running' ? 'pause' : 'play'} />
              {status === 'running'
                ? 'Pause'
                : status === 'paused'
                  ? 'Resume'
                  : status === 'done'
                    ? 'Retry'
                    : 'Start'}
            </button>
            <button
              className={s.endButton}
              disabled={!busy}
              onClick={() => {
                onStatus('idle');
                // End disables itself; keep keyboard focus on the primary action.
                requestAnimationFrame(() => startButton.current?.focus());
              }}
            >
              <Icon name="stop" />
              End
            </button>
          </div>
        </StageControls>
      </StageControls>
      <div className={s.stageHud} aria-label="Run score">
        <div>
          <span>Score</span>
          <strong>{stats.score.toLocaleString('en-US')}</strong>
        </div>
        <div>
          <span>Combo</span>
          <strong>
            {stats.combo}
            {comboMultiplier(stats.combo) > 1 && (
              <small>×{comboMultiplier(stats.combo).toFixed(2)}</small>
            )}
          </strong>
        </div>
        {challenge === 'endless' ? (
          <div>
            <span>Lives</span>
            <LifeMeter lives={view.lives} limit={limit} />
          </div>
        ) : (
          <div>
            <span>Accuracy</span>
            <strong>{stats.judged ? `${stats.accuracy}%` : '—'}</strong>
          </div>
        )}
      </div>
      <div
        className={s.fallingBoard}
        aria-label="Six-lane falling chart"
        data-direction={direction}
        data-reduced={reduced}
        data-speed={speed}
      >
        <div
          className={s.chartJudgement}
          aria-live="polite"
          data-grade={view.lastJudgement?.grade}
        >
          {status === 'running' &&
            view.lastJudgement &&
            view.elapsed - view.lastJudgement.at < 650 && (
              <>
                <strong>
                  {view.lastJudgement.grade === 'perfect' &&
                  Math.abs(view.lastJudgement.offset ?? Infinity) <=
                    Math.min(PURE_PLUS_WINDOW, windows.perfect)
                    ? 'Pure+'
                    : view.lastJudgement.grade === 'perfect'
                      ? 'Pure'
                      : view.lastJudgement.grade === 'good'
                        ? 'Far'
                        : view.lastJudgement.grade}
                </strong>
                <span>
                  {view.lastJudgement.offset === undefined
                    ? 'Find the next beat'
                    : `${Math.round(view.lastJudgement.offset) > 0 ? '+' : ''}${Math.round(view.lastJudgement.offset)} ms`}
                </span>
              </>
            )}
        </div>
        {showWindow && !reduced && (
          <div
            className={s.hitWindow}
            aria-hidden="true"
            style={{
              top: `${(direction === 'up' ? 100 - HIT_LINE : HIT_LINE) - (windows.good / travelTime) * HIT_LINE}%`,
              height: `${((2 * windows.good) / travelTime) * HIT_LINE}%`,
            }}
          >
            <i
              className={s.tightWindow}
              style={{
                top: `${((windows.good - Math.min(25, windows.perfect)) / (2 * windows.good)) * 100}%`,
                height: `${(Math.min(25, windows.perfect) / windows.good) * 100}%`,
              }}
            />
            <span
              style={{
                top: `${((windows.good - windows.perfect) / (2 * windows.good)) * 100}%`,
                height: `${(windows.perfect / windows.good) * 100}%`,
              }}
            />
          </div>
        )}
        {!reduced &&
          view.notes.map((note) => {
            const y = notePosition(note.at, displayTime, displaySpeed);
            if (y < 0 || y > 100 || status === 'done') return null;
            return (
              <div
                key={note.id}
                className={s.beatGuide}
                data-measure={note.id % 4 === 0}
                style={{ top: `${direction === 'up' ? 100 - y : y}%` }}
                aria-hidden="true"
              >
                {note.lanes.length > 1 && note.grade === 'pending' && (
                  <i
                    className={s.chordBridge}
                    style={{
                      left: `${((Math.min(...note.lanes) + 0.5) / 6) * 100}%`,
                      width: `${((Math.max(...note.lanes) - Math.min(...note.lanes)) / 6) * 100}%`,
                    }}
                  />
                )}
              </div>
            );
          })}
        <div
          className={s.judgementLine}
          style={{ top: `${direction === 'up' ? 100 - HIT_LINE : HIT_LINE}%` }}
          aria-hidden="true"
        >
          <span>HIT</span>
        </div>
        {keys.map((key, lane) => (
          <div
            key={lane}
            style={laneStyle(colors[lane])}
            className={`${s.fallingColumn} ${status === 'running' && view.held.has(lane) ? s.columnPressed : ''}`}
          >
            <span className={s.columnLabel}>{keyLabel(key)}</span>
            {status === 'running' &&
              latest?.lanes.includes(lane) &&
              latest.grade !== 'miss' &&
              view.elapsed - latest.judgedAt! < 280 && (
                <span
                  className={s.hitFeedback}
                  data-grade={latest.grade}
                  aria-hidden="true"
                >
                  {latest.grade === 'perfect' ? 'PURE' : 'FAR'}
                </span>
              )}
            {view.notes
              .filter((n) => n.grade === 'pending' && n.lanes.includes(lane))
              .map((note, previewIndex) => {
                const y = notePosition(note.at, displayTime, displaySpeed);
                if (y < 0 || y > 100 || status === 'done') return null;
                const due = Math.abs(note.at - displayTime) <= windows.good;
                return (
                  <span
                    key={note.id}
                    data-note={note.id}
                    data-chord={note.lanes.length > 1}
                    className={`${s.fallingNote} ${due ? s.noteDue : ''}`}
                    style={{
                      top: `${direction === 'up' ? 100 - (reduced ? (note.id === next?.id ? 70 : Math.max(8, 52 - previewIndex * 18)) : y) : reduced ? (note.id === next?.id ? 70 : Math.max(8, 52 - previewIndex * 18)) : y}%`,
                    }}
                    aria-hidden="true"
                  >
                    {note.lanes.length > 1 ? 'Ⅱ' : '•'}
                  </span>
                );
              })}
          </div>
        ))}
      </div>
      {keyAudioNotice && (
        <output className={s.motionNote}>{keyAudioNotice}</output>
      )}
      <div className={s.fallingPads}>
        {keys.map((key, lane) => (
          <div
            key={lane}
            style={laneStyle(colors[lane])}
            className={
              status === 'running' && view.held.has(lane)
                ? s.fallingPadPressed
                : ''
            }
            aria-label={`Rhythm lane ${lane + 1}, ${keyLabel(key)}`}
          >
            <kbd>{keyLabel(key)}</kbd>
            <span>{fingers[mapping[lane]]}</span>
          </div>
        ))}
      </div>
      <div className={s.fallingNext}>
        <span>
          {next && status !== 'done'
            ? `NEXT · ${next.lanes.map((n) => keyLabel(keys[n])).join(' + ')}`
            : 'CHART COMPLETE'}
        </span>
        <span>
          {busy && next
            ? `${Math.max(0, (next.at - view.elapsed) / 1000).toFixed(1)}s`
            : status === 'done'
              ? `${stats.hits} / ${stats.total} clean hits`
              : '3s lead-in · 1 note per beat'}
        </span>
      </div>
    </section>
  );
}
