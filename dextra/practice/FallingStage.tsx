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
  advanceRhythm,
  comboMultiplier,
  createRhythm,
  createRhythmFromChart,
  HIT_LINE,
  LEAD_IN,
  notePosition,
  pressRhythm,
  PURE_PLUS_WINDOW,
  releaseRhythm,
  rhythmSummary,
  TRAVEL_TIME,
} from '../engine/rhythm';
import type { Note, RhythmState } from '../engine/rhythm';
import { DIFFICULTIES } from '../engine/audio';
import { keyLabel } from '../model/training';
import { useSongPlayer } from '../hooks/useSongPlayer';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useKeyAudio } from '../hooks/useKeyAudio';
import { laneStyle } from '../ui/Keycap';
import Icon from '../ui/Icon';
import { activeProgram, clockText, fallingResult, typingInto } from './session';
import type { StageHandle, StageProps } from './session';
import { Display, KeyRow, Overlay } from './StageParts';
import p from './practice.module.css';

type GradeKey = 'pureplus' | 'perfect' | 'good' | 'miss' | 'extra';
const GRADE_LABEL: Record<GradeKey, string> = {
  pureplus: 'Pure+',
  perfect: 'Pure',
  good: 'Far',
  miss: 'Miss',
  extra: 'Extra',
};
/** Imported charts end shortly after their last note, not at the outro. */
const SONG_TAIL = 1200;
/** How long a judgement stays on screen, in ms of run time. */
const CALLOUT = 650;
const BURST = 280;

const worstOffset = (offsets: Record<number, number>) =>
  Object.values(offsets).reduce(
    (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
    0,
  );
const cloneState = (state: RhythmState): RhythmState => ({
  ...state,
  held: new Set(state.held),
  notes: state.notes.map((n) => ({ ...n })),
});

export default function FallingStage({
  settings,
  song,
  status,
  title,
  onStatus,
  onComplete,
  ref,
}: StageProps & { ref: Ref<StageHandle> }) {
  const {
    keys,
    mapping,
    windows,
    bpm,
    speed,
    showWindow,
    direction,
    challenge,
    lives,
    colors,
  } = settings;
  const program = activeProgram(settings);
  const reduced = useReducedMotion();
  const keyAudioNotice = useKeyAudio(
    settings.keySound,
    status === 'running',
    keys,
  );
  const player = useSongPlayer(
    song?.buffer ?? null,
    settings.songVolume,
    settings.audioOffset,
  );
  const endless = !song && challenge === 'endless';
  const build = useCallback(
    () =>
      song
        ? createRhythmFromChart(song.notes, song.bpm, mapping, windows)
        : createRhythm(bpm, mapping, program, windows, endless ? lives : 0),
    [song, mapping, windows, bpm, program, endless, lives],
  );
  // What the chart shows before a run: the opening of the configured chart.
  const preview = useMemo(() => build(), [build]);
  const [live, setLive] = useState<RhythmState | null>(null);
  const engine = useRef<RhythmState | null>(null);
  const clock = useRef<() => number>(() => 0);
  const completed = useRef(false);
  const [audioIssue, setAudioIssue] = useState('');
  const view = status === 'idle' || !live ? preview : live;

  // Settings, song and callbacks the run loop reads without restarting.
  const latest = useRef({ settings, song, onComplete, onStatus, player });
  useEffect(() => {
    latest.current = { settings, song, onComplete, onStatus, player };
  });

  useImperativeHandle(
    ref,
    () => ({
      start() {
        const state = build();
        engine.current = state;
        completed.current = false;
        setAudioIssue('');
        setLive(cloneState(state));
        onStatus('running');
      },
    }),
    [build, onStatus],
  );

  useEffect(() => {
    const state = engine.current;
    if (status !== 'running' || !state) return;
    const { song, player } = latest.current;
    let origin = performance.now() - state.elapsed;
    clock.current = song
      ? () => player.now() ?? state.elapsed
      : () => performance.now() - origin;
    // A start that resolves after this run was paused must not touch it.
    let cancelled = false;
    if (song)
      void player.play(state.elapsed).then((outcome) => {
        if (cancelled || outcome === 'cancelled') return;
        if (outcome === 'failed') {
          setAudioIssue(
            'The song could not play, so notes run on the page clock.',
          );
          origin = performance.now() - state.elapsed;
          clock.current = () => performance.now() - origin;
        }
      });
    const lastAt = state.notes.at(-1)?.at ?? 0;
    let frame = 0;
    const render = () => {
      advanceRhythm(state, clock.current());
      setLive(cloneState(state));
      const done = rhythmSummary(state).done;
      if (done && (!song || state.elapsed >= lastAt + SONG_TAIL)) {
        if (!completed.current) {
          completed.current = true;
          const { settings, onComplete } = latest.current;
          onComplete(fallingResult(state, settings, song));
        }
        return;
      }
      frame = requestAnimationFrame(render);
    };
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
  }, [status]);

  useEffect(() => {
    if (status !== 'running') return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onStatus('paused');
        return;
      }
      const lane = keys.indexOf(e.code);
      if (lane < 0 || typingInto(e.target)) return;
      e.preventDefault();
      if (!e.repeat && engine.current)
        pressRhythm(engine.current, lane, clock.current());
    };
    const up = (e: KeyboardEvent) => {
      const lane = keys.indexOf(e.code);
      if (lane >= 0 && engine.current) releaseRhythm(engine.current, lane);
    };
    const pause = () => onStatus('paused');
    const hidden = () => document.hidden && pause();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [status, keys, onStatus]);

  const stats = rhythmSummary(view);
  const playing = status === 'running' || status === 'paused';
  const displaySpeed = reduced ? 1 : speed;
  const travel = TRAVEL_TIME / displaySpeed;
  const now = status === 'idle' ? LEAD_IN - travel * 0.25 : view.elapsed;
  const plusWindow = Math.min(PURE_PLUS_WINDOW, windows.perfect);
  const flip = (y: number) => (direction === 'up' ? 100 - y : y);
  const gradeOf = (grade: GradeKey, offset?: number): GradeKey =>
    grade === 'perfect' && Math.abs(offset ?? Infinity) <= plusWindow
      ? 'pureplus'
      : grade;
  const pending = view.notes.filter((n) => n.grade === 'pending');
  const next = pending[0];
  const judgement = view.lastJudgement;
  const showCallout =
    status === 'running' && judgement && view.elapsed - judgement.at < CALLOUT;
  const bursts = view.notes.filter(
    (n): n is Note & { judgedAt: number } =>
      n.judgedAt !== undefined &&
      n.grade !== 'miss' &&
      status === 'running' &&
      view.elapsed - n.judgedAt < BURST,
  );
  const countdown =
    status === 'running' && view.elapsed < LEAD_IN
      ? Math.ceil((LEAD_IN - view.elapsed) / 1000)
      : null;
  const progress = stats.total ? stats.judged / stats.total : 0;

  /** Note positions in %, or fixed reading slots when motion is reduced. */
  const position = (note: Note) => {
    if (!reduced) return notePosition(note.at, now, displaySpeed);
    const slot = pending.indexOf(note);
    return slot < 0 || slot > 3 ? -1 : HIT_LINE - 6 - slot * 18;
  };
  const visible = (y: number) => y >= 0 && y <= 100 && status !== 'done';

  return (
    <section
      className={p.stage}
      aria-label="Falling chart"
      data-direction={direction}
    >
      <div className={p.hud} aria-label="Run score">
        <div className={p.hudMain}>
          <span className={p.hudLabel}>Score</span>
          <strong className={p.score}>
            {stats.score.toLocaleString('en-US')}
          </strong>
        </div>
        <div>
          <span className={p.hudLabel}>Combo</span>
          <strong>
            {stats.combo}
            {comboMultiplier(stats.combo) > 1 && (
              <small> ×{comboMultiplier(stats.combo).toFixed(2)}</small>
            )}
          </strong>
        </div>
        {endless ? (
          <div>
            <span className={p.hudLabel}>Lives</span>
            <span
              className={p.lives}
              aria-label={`${view.lives} of ${lives} lives left`}
            >
              {Array.from({ length: lives }, (_, i) => (
                <i key={i} data-lost={i >= view.lives || undefined} />
              ))}
            </span>
          </div>
        ) : (
          <div>
            <span className={p.hudLabel}>Accuracy</span>
            <strong>{stats.judged ? `${stats.accuracy}%` : '–'}</strong>
          </div>
        )}
        <div className={p.hudEnd}>
          <span className={p.hudLabel}>{song ? 'Song' : 'Groups'}</span>
          <strong>
            {song
              ? `${clockText(view.elapsed - LEAD_IN)} of ${clockText(song.duration * 1000)}`
              : endless
                ? stats.judged
                : `${stats.judged} of ${stats.total}`}
          </strong>
        </div>
      </div>

      <Display progress={endless ? null : progress}>
        <div className={p.lanes} aria-hidden="true">
          {keys.map((key, lane) => (
            <span
              key={key}
              style={laneStyle(colors[lane])}
              data-held={
                (status === 'running' && view.held.has(lane)) || undefined
              }
            />
          ))}
        </div>
        {!reduced &&
          view.notes.map((note) => {
            const y = position(note);
            return visible(y) ? (
              <i
                key={`beat-${note.id}`}
                className={p.beat}
                data-bar={note.id % 4 === 0 || undefined}
                style={{ top: `${flip(y)}%` }}
                aria-hidden="true"
              />
            ) : null;
          })}
        {showWindow && !reduced && (
          <div
            className={p.window}
            aria-hidden="true"
            style={{
              top: `${flip(HIT_LINE) - (windows.good / travel) * HIT_LINE}%`,
              height: `${((2 * windows.good) / travel) * HIT_LINE}%`,
            }}
          >
            <i
              style={{
                top: `${((windows.good - windows.perfect) / (2 * windows.good)) * 100}%`,
                height: `${(windows.perfect / windows.good) * 100}%`,
              }}
            />
            <i
              data-plus
              style={{
                top: `${((windows.good - plusWindow) / (2 * windows.good)) * 100}%`,
                height: `${(plusWindow / windows.good) * 100}%`,
              }}
            />
          </div>
        )}
        <div
          className={p.hitLine}
          style={{ top: `${flip(HIT_LINE)}%` }}
          aria-hidden="true"
        />
        {pending.map((note) => {
          const y = position(note);
          if (!visible(y)) return null;
          const first = Math.min(...note.lanes);
          const last = Math.max(...note.lanes);
          const due = Math.abs(note.at - now) <= windows.good;
          return (
            <div
              key={note.id}
              className={p.group}
              style={{ top: `${flip(y)}%` }}
              data-due={due || undefined}
              aria-hidden="true"
            >
              {note.lanes.length > 1 && (
                <i
                  className={p.bridge}
                  style={{
                    left: `${((first + 0.5) / 6) * 100}%`,
                    width: `${((last - first) / 6) * 100}%`,
                  }}
                />
              )}
              {note.lanes.map((lane) => (
                <b
                  key={lane}
                  className={p.note}
                  style={{
                    left: `${(lane / 6) * 100}%`,
                    ...laneStyle(colors[lane]),
                  }}
                />
              ))}
              {reduced && note === next && playing && (
                <span className={p.dueIn}>
                  {Math.max(0, (note.at - view.elapsed) / 1000).toFixed(1)} s
                </span>
              )}
            </div>
          );
        })}
        {bursts.map((note) =>
          note.lanes.map((lane) => (
            <i
              key={`${note.id}-${lane}`}
              className={p.burst}
              data-grade={gradeOf(
                note.grade as GradeKey,
                worstOffset(note.offsets),
              )}
              style={{
                left: `${((lane + 0.5) / 6) * 100}%`,
                top: `${flip(HIT_LINE)}%`,
              }}
              aria-hidden="true"
            />
          )),
        )}
        <div
          className={p.callout}
          style={{
            top: `${flip(direction === 'up' ? HIT_LINE - 22 : HIT_LINE - 14)}%`,
          }}
          aria-live="polite"
        >
          {showCallout && (
            <span data-grade={gradeOf(judgement.grade, judgement.offset)}>
              <strong>
                {GRADE_LABEL[gradeOf(judgement.grade, judgement.offset)]}
              </strong>
              {judgement.offset !== undefined && (
                <small>
                  {Math.round(judgement.offset) > 0 ? '+' : ''}
                  {Math.round(judgement.offset)} ms
                </small>
              )}
            </span>
          )}
        </div>

        {status === 'idle' && (
          <Overlay>
            <p className={p.overlayTitle}>{title}</p>
            <p>
              {song
                ? `${DIFFICULTIES.find((d) => d.id === song.difficulty)?.label} chart, ${song.notes.length} notes at ${Math.round(song.bpm)} BPM.`
                : endless
                  ? `Random groups until ${lives === 1 ? 'your only life is' : `all ${lives} lives are`} gone. A miss or a stray press costs one.`
                  : `32 groups at ${bpm} BPM. Notes reach the line on the beat.`}
            </p>
            <p className={p.overlayHint}>
              Press <kbd>Enter</kbd> to start. A three-beat count leads in.
            </p>
          </Overlay>
        )}
        {countdown !== null && (
          <Overlay quiet>
            <span className={p.countdown} key={countdown}>
              {countdown}
            </span>
          </Overlay>
        )}
        {status === 'paused' && (
          <Overlay>
            <p className={p.overlayTitle}>Paused</p>
            <p className={p.overlayHint}>
              <kbd>Enter</kbd> resumes from the same beat.
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
        {audioIssue ||
          keyAudioNotice ||
          (playing && next ? (
            `Next ${next.lanes.map((n) => keyLabel(keys[n])).join(' and ')}`
          ) : song ? (
            <>
              <Icon name="music" size={14} /> {song.name}
            </>
          ) : (
            ' '
          ))}
      </p>
    </section>
  );
}
