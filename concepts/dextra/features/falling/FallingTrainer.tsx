'use client';
import { useKeyAudio } from '../../hooks/useKeyAudio';
import {
  usePracticeAppearance,
  laneStyle,
} from '../settings/PracticeAppearance';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceRhythm,
  comboMultiplier,
  programs,
  createRhythm,
  createRhythmFromChart,
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
import { DIFFICULTIES } from '../../engine/audio';
import type { ChartNote, Difficulty } from '../../engine/audio';
import { useSongPlayer } from '../../hooks/useSongPlayer';
import { StageControls } from '../../components/workspace/StageContext';
import Icon from '../../components/ui/Icon';
import LifeMeter from '../../components/ui/LifeMeter';
import s from '../../styles.module.css';
import { fingers, keyLabel } from '../../model/training';
import type { Status, Result } from '../../model/training';

type GradeKey = 'pureplus' | 'perfect' | 'good' | 'miss' | 'extra';
const GRADE_LABEL: Record<GradeKey, string> = {
  pureplus: 'Pure+',
  perfect: 'Pure',
  good: 'Far',
  miss: 'Miss',
  extra: 'Extra',
};
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
export type SongAudio = {
  volume: number;
  offset: number;
  setVolume: (value: number) => void;
  setOffset: (value: number) => void;
};
const clockText = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
/** Imported charts end shortly after their last note, not at the outro. */
const SONG_TAIL = 1200;

const worstOffset = (offsets: Record<number, number>) =>
  Object.values(offsets).reduce(
    (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
    0,
  );

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
  song?: SongSession | null;
  songAudio: SongAudio;
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
  song = null,
  songAudio,
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
  const build = useCallback(
    (tempo: number) =>
      song
        ? createRhythmFromChart(song.notes, song.bpm, mapping, windows)
        : createRhythm(
            tempo,
            mapping,
            program,
            windows,
            challenge === 'endless' ? limit : 0,
          ),
    [song, mapping, program, windows, challenge, limit],
  );
  const player = useSongPlayer(
    song?.buffer ?? null,
    songAudio.volume,
    songAudio.offset,
  );
  const [audioIssue, setAudioIssue] = useState('');
  const clock = useRef<() => number>(() => 0);
  const [view, setView] = useState(() => build(initialBpm));
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
  const plusWindow = Math.min(PURE_PLUS_WINDOW, windows.perfect);
  const gradeKey = (grade: GradeKey, offset?: number): GradeKey =>
    grade === 'perfect' && Math.abs(offset ?? Infinity) <= plusWindow
      ? 'pureplus'
      : grade;
  const judgement =
    view.lastJudgement &&
    gradeKey(view.lastJudgement.grade, view.lastJudgement.offset);
  const latest = view.notes
    .filter((n) => n.judgedAt !== undefined)
    .reduce<(typeof view.notes)[number] | undefined>(
      (last, note) => (!last || note.judgedAt! >= last.judgedAt! ? note : last),
      undefined,
    );
  const latestKey =
    latest && latest.grade !== 'pending'
      ? gradeKey(latest.grade, worstOffset(latest.offsets))
      : undefined;
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
        setView(build(bpm));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, bpm, build]);

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
    const time = song
      ? () => player.now() ?? state.elapsed
      : () => performance.now() - origin.current;
    clock.current = time;
    // A start that resolves after this run was paused must not touch it.
    let cancelled = false;
    if (song)
      void player.play(state.elapsed).then((outcome) => {
        if (cancelled || outcome === 'cancelled') return;
        const failed = outcome === 'failed';
        setAudioIssue(
          failed
            ? 'Audio could not start. Notes still run on the page clock.'
            : '',
        );
        if (failed) {
          origin.current = performance.now() - state.elapsed;
          clock.current = () => performance.now() - origin.current;
        }
      });
    const lastAt = state.notes.at(-1)?.at ?? 0;
    let frame = 0;
    function render() {
      advanceRhythm(state, clock.current());
      setView({
        ...state,
        held: new Set(state.held),
        notes: state.notes.map((n) => ({ ...n })),
      });
      const result = rhythmSummary(state);
      if (result.done && (!song || state.elapsed >= lastAt + SONG_TAIL)) {
        if (!completed.current) {
          completed.current = true;
          onComplete({
            date: new Date().toISOString(),
            mode: song
              ? song.name
              : programs.find((p) => p.id === program)!.name,
            songId: song?.id,
            difficulty: song?.difficulty,
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
            bpm: song ? Math.round(song.bpm) : bpm,
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
      cancelled = true;
      cancelAnimationFrame(frame);
      advanceRhythm(state, clock.current());
      if (song) player.pause();
      state.held.clear();
      for (const note of state.notes)
        if (note.grade === 'pending') note.offsets = {};
    };
  }, [
    status,
    bpm,
    program,
    direction,
    challenge,
    limit,
    onStatus,
    onComplete,
    song,
    player,
  ]);

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
        pressRhythm(engine.current, lane, clock.current());
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
    const state = build(bpm);
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
            {song ? 'Song' : 'Tempo'}
          </h3>
          {song ? (
            <>
              <div className={s.songFacts}>
                <span>
                  <strong>{Math.round(song.bpm * 10) / 10}</strong> BPM
                </span>
                <span>
                  <strong>{song.notes.length}</strong> notes
                </span>
                <span>
                  <strong>{clockText(song.duration * 1000)}</strong> length
                </span>
              </div>
              <div className={s.tempo}>
                <label htmlFor="song-volume">
                  <span>Volume</span>
                  <strong>{Math.round(songAudio.volume * 100)}%</strong>
                </label>
                <input
                  id="song-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={songAudio.volume}
                  onChange={(e) => songAudio.setVolume(Number(e.target.value))}
                />
              </div>
              <div className={s.tempo}>
                <label htmlFor="song-offset">
                  <span>Audio offset</span>
                  <strong>
                    {songAudio.offset > 0 ? '+' : ''}
                    {songAudio.offset} ms
                  </strong>
                </label>
                <input
                  id="song-offset"
                  type="range"
                  min="-200"
                  max="200"
                  step="5"
                  value={songAudio.offset}
                  disabled={busy}
                  aria-describedby="song-offset-hint"
                  onChange={(e) => songAudio.setOffset(Number(e.target.value))}
                />
                <small id="song-offset-hint" className={s.fieldHint}>
                  Raise it if notes feel early against the music.
                </small>
              </div>
            </>
          ) : (
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
          )}
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
          {audioIssue && <output className={s.motionNote}>{audioIssue}</output>}
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
                  : `${stats.judged} / ${stats.total}`}
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
                  max={stats.total}
                  value={stats.judged}
                  aria-label="Chart progress"
                />
                <span>
                  {song
                    ? `${clockText(view.elapsed - LEAD_IN)} / ${clockText(song.duration * 1000)} · ${DIFFICULTIES.find((d) => d.id === song.difficulty)?.label}`
                    : `Phrase ${Math.min(4, Math.floor(stats.judged / 8) + 1)} of 4`}
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
          data-grade={judgement}
        >
          {status === 'running' &&
            view.lastJudgement &&
            view.elapsed - view.lastJudgement.at < 650 && (
              <>
                <strong>{GRADE_LABEL[judgement!]}</strong>
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
                top: `${((windows.good - plusWindow) / (2 * windows.good)) * 100}%`,
                height: `${(plusWindow / windows.good) * 100}%`,
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
                  data-grade={latestKey}
                  aria-hidden="true"
                >
                  {latestKey && GRADE_LABEL[latestKey].toUpperCase()}
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
              : song
                ? `♪ ${song.name}`
                : '3s lead-in · 1 note per beat'}
        </span>
      </div>
    </section>
  );
}
