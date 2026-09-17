'use client';
import ResizableDivider from './ResizableDivider';
import { usePanelWidths } from '../../hooks/usePanelWidths';
import type { CSSProperties } from 'react';

import { PracticeAppearance } from '../../features/settings/PracticeAppearance';
import useFullscreen from '../../hooks/useFullscreen';
import { StageContext } from './StageContext';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { lockScroll } from '../../lib/lockScroll';
import Select from '../ui/Select';
import StaticTrainer from '../../features/static/StaticTrainer';
import FallingTrainer from '../../features/falling/FallingTrainer';
import type { SongSession } from '../../features/falling/FallingTrainer';
import { DIFFICULTIES, generateChart } from '../../engine/audio';
import type { Difficulty } from '../../engine/audio';
import { useSongLibrary } from '../../hooks/useSongLibrary';
import type { LoadedSong } from '../../hooks/useSongLibrary';
import { programs } from '../../engine/rhythm';
import type { ProgramId } from '../../engine/rhythm';
import {
  defaults,
  defaultFingers,
  keyOptions,
  lifeOptions,
  timeOptions,
} from '../../model/training';
import type { Result, Status } from '../../model/training';
import s from '../../styles.module.css';

import LibraryPanel from '../../features/library/LibraryPanel';
import SettingsPanel from '../../features/settings/SettingsPanel';
import ResultDetails from '../../features/results/ResultDetails';
import PracticeGuide from './PracticeGuide';
import IntroCurtain from './IntroCurtain';
import { focusPanelToggle } from './focusPanelToggle';

type Drawer = 'library' | 'settings' | 'history' | null;
function validResult(value: unknown): value is Result {
  if (!value || typeof value !== 'object') return false;
  const r = value as Result;
  return (
    typeof r.mode === 'string' &&
    typeof r.date === 'string' &&
    Number.isFinite(Date.parse(r.date)) &&
    [r.accuracy, r.hits, r.total, r.bpm].every(Number.isFinite)
  );
}
export default function Dextra() {
  return (
    <PracticeAppearance>
      <Workspace />
    </PracticeAppearance>
  );
}
function Workspace() {
  const {
    widths,
    collapsed,
    resize,
    toggle: togglePanel,
    reset: resetPanel,
  } = usePanelWidths();
  const [keys, setKeys] = useState(defaults);
  const [mapping, setMapping] = useState(defaultFingers);
  const [challenge, setChallenge] = useState<'standard' | 'endless'>(
    'standard',
  );
  const [timeLimit, setTimeLimit] = useState(60);
  const [lives, setLives] = useState(3);
  const [initialBpm, setInitialBpm] = useState(60);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [format, setFormat] = useState<'falling' | 'static'>('falling');
  const [windows, setWindows] = useState({ perfect: 50, good: 100 });
  const [program, setProgram] = useState<ProgramId>('mixed');
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const library = useSongLibrary();
  const [song, setSong] = useState<LoadedSong | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [songNotice, setSongNotice] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [songVolume, setSongVolume] = useState(0.8);
  const [audioOffset, setAudioOffset] = useState(0);
  const restoreSong = useRef<string | null>(null);
  const {
    panel: stagePanel,
    trigger: stageTrigger,
    expanded: stageExpanded,
    toggle: toggleStage,
  } = useFullscreen(status, setStatus);
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  const [playback, setPlayback] = useState<HTMLDivElement | null>(null);
  const [statusSlot, setStatusSlot] = useState<HTMLDivElement | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [capture, setCapture] = useState<number | null>(null);
  const [notice, setNotice] = useState(
    'Select a key, then press its replacement.',
  );
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [loaded, setLoaded] = useState(false);
  const backdropPress = useRef(false);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const resultPanel = useRef<HTMLElement | null>(null);
  const busy = status === 'running' || status === 'paused';
  const selected = programs.find(
    (p) => p.id === (challenge === 'endless' ? 'random' : program),
  )!;
  const difficultyLabel = DIFFICULTIES.find((d) => d.id === difficulty)!.label;
  const songSession = useMemo<SongSession | null>(
    () =>
      song && {
        id: song.id,
        name: song.name,
        duration: song.duration,
        bpm: song.bpm,
        difficulty,
        buffer: song.buffer,
        notes: generateChart(song, {
          bpm: song.bpm,
          offset: song.offset,
          difficulty,
          mapping,
        }),
      },
    [song, difficulty, mapping],
  );
  const songAudio = useMemo(
    () => ({
      volume: songVolume,
      offset: audioOffset,
      setVolume: setSongVolume,
      setOffset: setAudioOffset,
    }),
    [songVolume, audioOffset],
  );
  /** The trainer is keyed by difficulty, so any change starts from idle. */
  const changeDifficulty = useCallback((next: Difficulty) => {
    setDifficulty(next);
    setResult(null);
    setStatus('idle');
    setRevision((n) => n + 1);
  }, []);
  /** Loads an imported song; resolves false if it is missing or unreadable. */
  const loadSong = useCallback(
    async (id: string) => {
      setLoadingSongId(id);
      setSongNotice('');
      try {
        const next = await library.load(id);
        if (!next) {
          setSongNotice('That song is no longer in this browser.');
          return false;
        }
        setSong(next);
        setFormat('falling');
        setChallenge('standard');
        setResult(null);
        setRevision((n) => n + 1);
        setStatus('idle');
        setDrawer(null);
        return true;
      } catch {
        setSongNotice('The song could not be decoded in this browser.');
        return false;
      } finally {
        setLoadingSongId(null);
      }
    },
    [library],
  );
  const openDrawer = useCallback((next: Exclude<Drawer, null>) => {
    setStatus((value) => (value === 'running' ? 'paused' : value));
    setCapture(null);
    setDrawer(next);
  }, []);
  // Normalize links from the former hash-based panel navigation once.
  useEffect(() => {
    if (
      [
        '#practice',
        '#history',
        '#practice/library',
        '#practice/settings',
      ].includes(location.hash)
    ) {
      window.history.replaceState(
        window.history.state,
        '',
        location.pathname + location.search,
      );
    }
  }, []);
  const changeStatus = useCallback((value: Status) => {
    setStatus(value);
    if (value === 'running') setResult(null);
  }, []);
  const complete = useCallback((value: Result) => {
    const commit = () => {
      setHistory((rows) => [value, ...rows]);
      setResult(value);
      setStatus('done');
      requestAnimationFrame(() =>
        resultPanel.current?.focus({ preventScroll: true }),
      );
    };
    if (document.fullscreenElement)
      void document.exitFullscreen().then(commit, commit);
    else commit();
  }, []);
  async function again() {
    if (!result) return;
    if (result.songId) {
      if (result.difficulty) setDifficulty(result.difficulty);
      if (result.direction) setDirection(result.direction);
      if (result.windows) setWindows(result.windows);
      if (song?.id !== result.songId && !(await loadSong(result.songId)))
        return;
      setResult(null);
      setRevision((n) => n + 1);
      setStatus('running');
      return;
    }
    setSong(null);
    const match = programs.find((p) => p.name === result.mode);
    setProgram(match?.id ?? 'mixed');
    setFormat(result.format ?? 'falling');
    setDirection(result.direction ?? 'down');
    setChallenge(result.challenge ?? 'standard');
    if (result.format === 'static')
      setTimeLimit(
        timeOptions.includes(result.limit ?? 0) ? result.limit! : 60,
      );
    else {
      setLives(lifeOptions.includes(result.limit ?? 0) ? result.limit! : 3);
      setInitialBpm(result.bpm || 60);
    }
    if (result.windows) setWindows(result.windows);
    setResult(null);
    setRevision((n) => n + 1);
    setStatus('running');
  }
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(localStorage.getItem('dextra-v1') || 'null');
        const savedTheme = localStorage.getItem('dextra-theme');
        if (savedTheme === 'dark' || savedTheme === 'light')
          setTheme(savedTheme);
        if (saved) {
          if (
            Array.isArray(saved.keys) &&
            saved.keys.length === 6 &&
            new Set(saved.keys).size === 6 &&
            saved.keys.every(
              (k: unknown) => typeof k === 'string' && keyOptions.includes(k),
            )
          )
            setKeys(saved.keys);
          if (
            Array.isArray(saved.mapping) &&
            saved.mapping.length === 6 &&
            saved.mapping.every(
              (v: unknown) =>
                typeof v === 'number' &&
                Number.isInteger(v) &&
                v >= 0 &&
                v <= 4,
            )
          )
            setMapping(saved.mapping);
          if (saved.challenge === 'standard' || saved.challenge === 'endless')
            setChallenge(saved.challenge);
          if (timeOptions.includes(saved.timeLimit))
            setTimeLimit(saved.timeLimit);
          if (lifeOptions.includes(saved.lives)) setLives(saved.lives);
          if (saved.direction === 'up' || saved.direction === 'down')
            setDirection(saved.direction);
          if (saved.format === 'static' || saved.format === 'falling')
            setFormat(saved.format);
          if (
            Number.isFinite(saved.windows?.perfect) &&
            Number.isFinite(saved.windows?.good) &&
            saved.windows.perfect >= 10 &&
            saved.windows.perfect <= saved.windows.good &&
            saved.windows.good <= 250
          )
            setWindows(
              saved.timingVersion === 2
                ? saved.windows
                : { perfect: 50, good: 100 },
            );
          if (programs.some((p) => p.id === saved.program))
            setProgram(saved.program);
          if (['easy', 'normal', 'hard'].includes(saved.difficulty))
            setDifficulty(saved.difficulty);
          if (
            Number.isFinite(saved.songVolume) &&
            saved.songVolume >= 0 &&
            saved.songVolume <= 1
          )
            setSongVolume(saved.songVolume);
          if (
            Number.isFinite(saved.audioOffset) &&
            Math.abs(saved.audioOffset) <= 200
          )
            setAudioOffset(saved.audioOffset);
          if (typeof saved.songId === 'string')
            restoreSong.current = saved.songId;
          if (Array.isArray(saved.history)) {
            const rows = saved.history.filter(validResult);
            setHistory(rows);
          }
        }
      } catch {
        /* Local preferences are optional. */
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        'dextra-v1',
        JSON.stringify({
          keys,
          mapping,
          history,
          program,
          format,
          windows,
          timingVersion: 2,
          direction,
          challenge,
          timeLimit,
          lives,
          songId: song?.id ?? null,
          difficulty,
          songVolume,
          audioOffset,
        }),
      );
      localStorage.setItem('dextra-theme', theme);
    } catch {
      /* Training remains available without storage. */
    }
  }, [
    loaded,
    keys,
    mapping,
    history,
    program,
    theme,
    format,
    windows,
    direction,
    challenge,
    timeLimit,
    lives,
    song,
    difficulty,
    songVolume,
    audioOffset,
  ]);
  // Reopen the last imported song once preferences have loaded.
  useEffect(() => {
    const id = restoreSong.current;
    if (!loaded || !id) return;
    restoreSong.current = null;
    queueMicrotask(() => void loadSong(id));
  }, [loaded, loadSong]);
  useEffect(() => {
    if (!loaded) return;
    if (!drawer) {
      dialog.current?.close();
      return;
    }
    const unlock = lockScroll();
    dialog.current?.showModal();
    return unlock;
  }, [drawer, loaded]);
  useEffect(() => {
    if (capture === null) return;
    function down(e: KeyboardEvent) {
      if (e.code === 'Tab' || e.code === 'Escape') {
        if (e.code === 'Escape') e.preventDefault();
        setCapture(null);
        return;
      }
      e.preventDefault();
      if (!keyOptions.includes(e.code)) {
        setNotice('Use a letter, number, Shift, Space, or arrow key.');
        return;
      }
      if (keys.some((key, i) => key === e.code && i !== capture)) {
        setNotice('That key already belongs to another lane.');
        return;
      }
      setKeys((values) =>
        values.map((key, i) => (i === capture ? e.code : key)),
      );
      setCapture(null);
      setNotice('Key saved.');
    }
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [capture, keys]);
  function loadProgram(id: ProgramId) {
    setSong(null);
    setResult(null);
    setChallenge('standard');
    setProgram(id);
    setRevision((n) => n + 1);
    setStatus('idle');
    setDrawer(null);
  }
  return (
    <div
      className={`${s.root} ${s.practiceApp}`}
      data-ready={loaded}
      data-theme={theme}
    >
      <IntroCurtain ready={loaded} />
      <header className={s.appHeader}>
        <Link href="/concepts/dextra" className={s.appBrand}>
          <span aria-hidden="true">≋</span>
          <strong>
            DEXTRA<span className={s.brandSuffix}> / SIX</span>
          </strong>
        </Link>
        <span className={s.appIdentity}>LEFT-HAND RHYTHM STUDIO</span>
        <div className={s.appActions}>
          <Select
            label="Color theme"
            value={theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(v) => setTheme(v as typeof theme)}
          />
          <button onClick={() => openDrawer('history')}>
            History <span className={s.countBadge}>{history.length}</span>
          </button>
          <button onClick={() => openDrawer('settings')}>Settings</button>
        </div>
      </header>
      <StageContext.Provider
        value={{
          controls,
          playback,
          status: statusSlot,
          expanded: stageExpanded,
          toggle: toggleStage,
        }}
      >
        <main
          ref={stagePanel}
          className={`${s.practiceMain} ${stageExpanded ? s.stageFullscreen : ''}`}
          data-playing={status === 'running'}
        >
          <div
            className={s.practiceLayout}
            data-result={!!result}
            data-left-collapsed={collapsed.left}
            data-right-collapsed={collapsed.right}
            style={
              {
                '--left-width': `${widths.left}px`,
                '--right-width': `${widths.right}px`,
              } as CSSProperties
            }
          >
            <aside
              id="dextra-controls"
              className={s.controlColumn}
              aria-label="Practice controls"
              data-collapsed={collapsed.left}
            >
              <button
                className={s.railToggle}
                aria-expanded="false"
                aria-controls="dextra-controls"
                onClick={() => {
                  togglePanel('left', true);
                  focusPanelToggle('dextra-controls', s.panelToggle);
                }}
              >
                <Icon name="expandLeft" />
                <span>Controls</span>
              </button>
              <div className={s.controlScroll}>
                <section
                  className={s.loadedPlan}
                  aria-label="Loaded training plan"
                >
                  <div>
                    <div className={s.panelTop}>
                      <span className={s.eyebrow}>
                        {song ? 'CURRENT SONG' : 'CURRENT EXERCISE'}
                      </span>
                      <button
                        className={s.panelToggle}
                        aria-label="Collapse controls panel"
                        aria-expanded="true"
                        aria-controls="dextra-controls"
                        title="Collapse panel"
                        onClick={() => {
                          togglePanel('left', false);
                          focusPanelToggle('dextra-controls', s.railToggle);
                        }}
                      >
                        <Icon name="collapseLeft" />
                      </button>
                    </div>
                    <h2>{songSession ? songSession.name : selected.name}</h2>
                    <p>
                      {songSession
                        ? `${difficultyLabel} · ${Math.round(songSession.bpm)} BPM · ${songSession.notes.length} notes`
                        : `${format === 'static' ? 'Static' : 'Falling'} · ${
                            challenge === 'endless'
                              ? format === 'static'
                                ? `${timeLimit}s timed`
                                : `${lives} ${lives === 1 ? 'life' : 'lives'}`
                              : '32 groups'
                          }`}
                    </p>
                    {songNotice && (
                      <output className={s.motionNote}>{songNotice}</output>
                    )}
                  </div>
                  <button
                    onClick={() => openDrawer('library')}
                    aria-haspopup="dialog"
                  >
                    <Icon name="random" />
                    {song ? 'Library' : 'Change exercise'}
                  </button>
                  {song && (
                    <button
                      className={s.songExit}
                      disabled={busy}
                      onClick={() => {
                        setSong(null);
                        setResult(null);
                        setRevision((n) => n + 1);
                        setStatus('idle');
                      }}
                    >
                      <span aria-hidden="true">←</span> Back to {selected.name}
                    </button>
                  )}
                </section>
                <section
                  className={s.panelSection}
                  aria-labelledby="panel-setup"
                >
                  <h3 className={s.panelHeading} id="panel-setup">
                    Setup
                  </h3>
                  <div className={s.formatBar} aria-label="Practice format">
                    {(['falling', 'static'] as const).map((value) => (
                      <button
                        key={value}
                        disabled={busy || (!!song && value === 'static')}
                        title={
                          song && value === 'static'
                            ? 'Songs play as falling charts'
                            : undefined
                        }
                        aria-pressed={format === value}
                        onClick={() => {
                          setFormat(value);
                          setResult(null);
                          setStatus('idle');
                          setRevision((n) => n + 1);
                        }}
                      >
                        {value === 'falling' ? 'Falling' : 'Static'}
                      </button>
                    ))}
                  </div>
                  {song ? (
                    <div className={s.field}>
                      <span className={s.fieldLabel} aria-hidden="true">
                        Difficulty
                      </span>
                      <Select
                        label="Difficulty"
                        icon="play"
                        value={difficulty}
                        disabled={busy}
                        options={DIFFICULTIES.map((d) => ({
                          value: d.id,
                          label: d.label,
                        }))}
                        onChange={(v) => changeDifficulty(v as Difficulty)}
                      />
                    </div>
                  ) : (
                    <div
                      className={
                        challenge === 'endless' ? s.fieldPair : s.fieldSingle
                      }
                    >
                      <div className={s.field}>
                        <span className={s.fieldLabel} aria-hidden="true">
                          Challenge
                        </span>
                        <Select
                          label="Challenge"
                          icon={
                            challenge === 'standard'
                              ? 'play'
                              : format === 'static'
                                ? 'clock'
                                : 'heart'
                          }
                          value={challenge}
                          disabled={busy}
                          options={[
                            { value: 'standard', label: 'Standard' },
                            {
                              value: 'endless',
                              label: format === 'static' ? 'Timed' : 'Survival',
                            },
                          ]}
                          onChange={(v) => {
                            setChallenge(v as typeof challenge);
                            setStatus('idle');
                            setResult(null);
                            setRevision((n) => n + 1);
                          }}
                        />
                      </div>
                      {challenge === 'endless' && (
                        <div className={s.field}>
                          <span className={s.fieldLabel} aria-hidden="true">
                            {format === 'static' ? 'Time limit' : 'Lives'}
                          </span>
                          <Select
                            label={format === 'static' ? 'Time limit' : 'Lives'}
                            value={String(
                              format === 'static' ? timeLimit : lives,
                            )}
                            disabled={busy}
                            options={(format === 'static'
                              ? timeOptions
                              : lifeOptions
                            ).map((n) => ({
                              value: String(n),
                              label:
                                format === 'static'
                                  ? `${n}s`
                                  : `${n} ${n === 1 ? 'life' : 'lives'}`,
                            }))}
                            onChange={(v) => {
                              if (format === 'static') setTimeLimit(Number(v));
                              else setLives(Number(v));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className={s.field}>
                    <span className={s.fieldLabel} aria-hidden="true">
                      Scroll direction
                    </span>
                    <Select
                      icon={direction}
                      label="Scroll direction"
                      disabled={busy}
                      value={direction}
                      options={[
                        { value: 'down', label: 'Down' },
                        { value: 'up', label: 'Up' },
                      ]}
                      onChange={(v) => {
                        setDirection(v as typeof direction);
                        setStatus('idle');
                      }}
                    />
                  </div>
                </section>
                <div ref={setControls} hidden={!!result} />
              </div>
              <div className={s.controlFooter}>
                <div
                  ref={setStatusSlot}
                  className={s.statusSlot}
                  hidden={!!result}
                />
                <div ref={setPlayback} hidden={!!result} />
                <div className={s.stageUtilities}>
                  <button
                    ref={stageTrigger}
                    data-exit={stageExpanded || undefined}
                    title={stageExpanded ? 'Exit fullscreen' : 'Fullscreen'}
                    onClick={() => void toggleStage()}
                  >
                    <Icon name={stageExpanded ? 'close' : 'fullscreen'} />
                    {stageExpanded ? 'Exit fullscreen' : 'Fullscreen'}
                  </button>
                  {stageExpanded && (
                    <>
                      <button
                        title="Settings"
                        onClick={() => openDrawer('settings')}
                      >
                        <Icon name="settings" />
                        Settings
                      </button>
                      <button
                        title="History"
                        onClick={() => openDrawer('history')}
                      >
                        <Icon name="history" />
                        History{' '}
                        <span className={s.countBadge}>{history.length}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </aside>
            <ResizableDivider
              side="left"
              controls="dextra-controls"
              value={widths.left}
              collapsed={collapsed.left}
              onChange={(value) => resize('left', value)}
              onToggle={() => togglePanel('left')}
              onReset={() => resetPanel('left')}
            />
            <div className={s.practiceColumn}>
              <div className={s.trainerHost} hidden={!!result}>
                {format === 'falling' ? (
                  <FallingTrainer
                    initialBpm={initialBpm}
                    windows={windows}
                    key={`${song?.id ?? program}-${difficulty}-${revision}`}
                    song={songSession}
                    songAudio={songAudio}
                    direction={direction}
                    challenge={challenge}
                    limit={lives}
                    program={selected.id}
                    keys={keys}
                    mapping={mapping}
                    status={status}
                    onStatus={changeStatus}
                    onComplete={complete}
                  />
                ) : (
                  <StaticTrainer
                    key={`${program}-${revision}`}
                    direction={direction}
                    challenge={challenge}
                    limit={timeLimit}
                    program={selected.id}
                    keys={keys}
                    mapping={mapping}
                    status={status}
                    onStatus={changeStatus}
                    onComplete={complete}
                  />
                )}
              </div>
              {result && (
                <section
                  className={s.resultScreen}
                  ref={resultPanel}
                  tabIndex={-1}
                  aria-label="Result"
                >
                  <span className={s.resultBadge}>
                    <Icon name="retry" />
                    Run complete
                  </span>
                  <h2>{result.mode}</h2>
                  <p>
                    {result.challenge === 'endless'
                      ? result.format === 'static'
                        ? 'Time is up'
                        : 'Out of lives'
                      : 'Chart complete'}
                  </p>
                  <ResultDetails result={result} />
                  <div className={s.resultActions}>
                    <button
                      className={s.startButton}
                      disabled={busy}
                      onClick={() => void again()}
                    >
                      <Icon name="retry" />
                      Again
                    </button>
                    <button
                      className={s.endButton}
                      onClick={() => {
                        setResult(null);
                        setStatus((v) => (v === 'done' ? 'idle' : v));
                      }}
                    >
                      Practice
                    </button>
                    <button
                      className={s.endButton}
                      onClick={() => openDrawer('history')}
                    >
                      History
                    </button>
                  </div>
                </section>
              )}
            </div>
            <ResizableDivider
              side="right"
              controls="dextra-guide"
              value={widths.right}
              collapsed={collapsed.right}
              onChange={(value) => resize('right', value)}
              onToggle={() => togglePanel('right')}
              onReset={() => resetPanel('right')}
            />
            <PracticeGuide
              keys={keys}
              mapping={mapping}
              description={
                songSession
                  ? `An imported song on ${difficultyLabel}: ${songSession.notes.length} notes on a ${Math.round(songSession.bpm)} BPM grid, generated from its strongest onsets. Low hits favour the outer keys.`
                  : selected.description
              }
              format={format}
              challenge={challenge}
              mode={songSession ? songSession.name : selected.name}
              history={history}
              collapsed={collapsed.right}
              onCollapse={(open) => togglePanel('right', open)}
              onHistory={() => openDrawer('history')}
              onSettings={() => openDrawer('settings')}
              onLibrary={() => openDrawer('library')}
            />
          </div>
          <dialog
            ref={dialog}
            className={s.workspaceDrawer}
            aria-labelledby="drawer-title"
            onPointerDown={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              backdropPress.current =
                e.clientX < box.left ||
                e.clientX > box.right ||
                e.clientY < box.top ||
                e.clientY > box.bottom;
            }}
            onPointerUp={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const outside =
                e.clientX < box.left ||
                e.clientX > box.right ||
                e.clientY < box.top ||
                e.clientY > box.bottom;
              if (backdropPress.current && outside) {
                setCapture(null);
                setDrawer(null);
              }
              backdropPress.current = false;
            }}
            onPointerCancel={() => {
              backdropPress.current = false;
            }}
            onCancel={(e) => {
              e.preventDefault();
              if (capture !== null) setCapture(null);
              else setDrawer(null);
            }}
            onClose={() => {
              setDrawer(null);
              setCapture(null);
            }}
          >
            <div className={s.drawerHeader}>
              <div>
                <span>
                  PRACTICE /{' '}
                  {drawer === 'library'
                    ? 'TRAINING PLANS'
                    : drawer === 'history'
                      ? 'RECORDS'
                      : 'SETUP'}
                </span>
                <h2 id="drawer-title">
                  {drawer === 'library'
                    ? 'Library'
                    : drawer === 'history'
                      ? 'History'
                      : 'Settings'}
                </h2>
              </div>
              <button
                aria-label="Close panel"
                onClick={() => {
                  setCapture(null);
                  setDrawer(null);
                }}
              >
                ×
              </button>
            </div>
            {drawer === 'library' && (
              <LibraryPanel
                busy={busy}
                challenge={challenge}
                program={program}
                loadProgram={loadProgram}
                songs={library.songs}
                songsAvailable={library.available}
                job={library.job}
                loadedSongId={song?.id ?? null}
                loadingSongId={loadingSongId}
                difficulty={difficulty}
                onDifficulty={changeDifficulty}
                onImport={(file) =>
                  void library.importFile(file).then((id) => {
                    if (id) void loadSong(id);
                  })
                }
                onDismissJob={library.dismissJob}
                onLoadSong={(id) => void loadSong(id)}
                onRemoveSong={(id) => {
                  if (song?.id === id) {
                    setSong(null);
                    setRevision((n) => n + 1);
                    setStatus('idle');
                  }
                  void library.remove(id);
                }}
                onRetuneSong={(id, bpm) =>
                  void library.retune(id, bpm).then((grid) => {
                    if (grid)
                      setSong((current) =>
                        current?.id === id ? { ...current, ...grid } : current,
                      );
                  })
                }
              />
            )}
            {drawer === 'settings' && (
              <SettingsPanel
                theme={theme}
                setTheme={setTheme}
                windows={windows}
                setWindows={setWindows}
                busy={busy}
                keys={keys}
                setKeys={setKeys}
                mapping={mapping}
                setMapping={setMapping}
                capture={capture}
                setCapture={setCapture}
                notice={notice}
                setNotice={setNotice}
                setStatus={setStatus}
              />
            )}
            {drawer === 'history' && (
              <>
                <p className={s.drawerIntro}>
                  {history.length} completed sessions on this device. Select a
                  record to review its result in Practice.
                </p>
                {history.length === 0 ? (
                  <div className={s.reviewEmpty}>
                    <p>Your first completed run will appear here.</p>
                  </div>
                ) : (
                  <div className={s.recordList}>
                    {history.map((r, i) => (
                      <button
                        key={`${r.date}-${i}`}
                        onClick={() => {
                          setResult(r);
                          setDrawer(null);
                          requestAnimationFrame(() => {
                            resultPanel.current?.scrollIntoView({
                              block: 'start',
                            });
                            resultPanel.current?.focus();
                          });
                        }}
                      >
                        <span>
                          <strong>{r.mode}</strong>
                          <small>
                            {r.challenge === 'endless'
                              ? r.format === 'static'
                                ? `${r.limit}s timed · `
                                : `${r.limit} lives · `
                              : ''}
                            {new Date(r.date).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            ·{' '}
                            {r.format === 'static'
                              ? `Static · ${r.errorRate ?? 0}% errors`
                              : r.songId
                                ? `Song · ${DIFFICULTIES.find((d) => d.id === r.difficulty)?.label ?? 'Normal'} · ${r.bpm} BPM`
                                : `${r.bpm} BPM · Falling`}
                          </small>
                        </span>
                        <b>
                          {r.rank && <i className={s.rankBadge}>{r.rank}</i>}
                          {r.format === 'static'
                            ? r.challenge === 'endless'
                              ? `${r.hits} groups`
                              : `${((r.durationMs ?? 0) / 1000).toFixed(2)}s`
                            : r.score !== undefined
                              ? r.score.toLocaleString('en-US')
                              : `${r.accuracy}%`}
                          <span aria-hidden="true">↗</span>
                        </b>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </dialog>
        </main>
      </StageContext.Provider>
    </div>
  );
}
