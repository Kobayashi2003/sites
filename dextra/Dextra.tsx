'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateChart } from './engine/audio';
import { programs } from './engine/rhythm';
import type { ProgramId } from './engine/rhythm';
import type { Result, Status } from './model/training';
import type { Settings } from './model/settings';
import { useDextraStore } from './hooks/useDextraStore';
import { useSongLibrary } from './hooks/useSongLibrary';
import type { LoadedSong } from './hooks/useSongLibrary';
import { useFullscreen } from './hooks/useFullscreen';
import { useReducedMotion } from './hooks/useReducedMotion';
import Console from './practice/Console';
import FallingStage from './practice/FallingStage';
import StaticStage from './practice/StaticStage';
import ResultPanel from './practice/ResultPanel';
import { activeProgram } from './practice/session';
import type { SongSession, StageHandle } from './practice/session';
import LibraryView from './library/LibraryView';
import RecordsView from './records/RecordsView';
import SetupView from './setup/SetupView';
import Icon from './ui/Icon';
import { display, text } from './fonts';
import s from './styles.module.css';

type View = 'practice' | 'library' | 'records' | 'setup';
const VIEWS: { id: View; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'library', label: 'Library' },
  { id: 'records', label: 'Records' },
  { id: 'setup', label: 'Setup' },
];

/** Keys typed into these belong to them, not to the chart shortcuts. */
const interactive = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest('button, a, input, select, textarea, summary');

export default function Dextra() {
  const store = useDextraStore();
  const { settings, history, loaded, update, addResult, clearHistory } = store;
  const library = useSongLibrary();
  const reduced = useReducedMotion();
  const [view, setView] = useState<View>('practice');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [song, setSong] = useState<LoadedSong | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [songNotice, setSongNotice] = useState('');
  const stage = useRef<StageHandle>(null);
  const resultPanel = useRef<HTMLElement>(null);
  const playButton = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const busy = status === 'running' || status === 'paused';

  const pause = useCallback(
    () => setStatus((v) => (v === 'running' ? 'paused' : v)),
    [],
  );
  const {
    target: fullscreenTarget,
    active: fullscreenActive,
    toggle: toggleFullscreen,
    supported: fullscreenSupported,
  } = useFullscreen<HTMLDivElement>(pause);

  const songSession = useMemo<SongSession | null>(
    () =>
      song && {
        id: song.id,
        name: song.name,
        duration: song.duration,
        bpm: song.bpm,
        difficulty: settings.difficulty,
        buffer: song.buffer,
        notes: generateChart(song, {
          bpm: song.bpm,
          offset: song.offset,
          difficulty: settings.difficulty,
          mapping: settings.mapping,
        }),
      },
    [song, settings.difficulty, settings.mapping],
  );

  /** Settings that change the chart drop a finished result and its run. */
  const updateRun = useCallback(
    (patch: Partial<Settings>) => {
      update(patch);
      if (status === 'done') {
        setResult(null);
        setStatus('idle');
      }
    },
    [update, status],
  );

  const start = useCallback(() => {
    setResult(null);
    stage.current?.start();
  }, []);
  const play = useCallback(() => {
    if (status === 'running') setStatus('paused');
    else if (status === 'paused') setStatus('running');
    else start();
  }, [status, start]);
  const end = useCallback(() => {
    setStatus('idle');
    requestAnimationFrame(() =>
      playButton.current?.querySelector('button')?.focus(),
    );
  }, []);
  const complete = useCallback(
    (value: Result) => {
      addResult(value);
      setResult(value);
      setStatus('done');
      requestAnimationFrame(() =>
        resultPanel.current?.focus({ preventScroll: true }),
      );
    },
    [addResult],
  );

  const show = useCallback(
    (next: View) => {
      pause();
      setView(next);
    },
    [pause],
  );

  const loadSong = useCallback(
    async (id: string) => {
      setLoadingSongId(id);
      setSongNotice('');
      try {
        const next = await library.load(id);
        if (!next) {
          setSongNotice('That song is no longer stored in this browser.');
          update({ songId: null });
          return;
        }
        setSong(next);
        update({ songId: id });
        setResult(null);
        setStatus('idle');
        setView('practice');
      } catch {
        setSongNotice('This browser could not decode the song.');
      } finally {
        setLoadingSongId(null);
      }
    },
    [library, update],
  );
  const unloadSong = useCallback(() => {
    setSong(null);
    update({ songId: null });
    setResult(null);
    setStatus('idle');
  }, [update]);
  const loadPlan = useCallback(
    (id: ProgramId) => {
      setSong(null);
      update({ program: id, challenge: 'standard', songId: null });
      setResult(null);
      setStatus('idle');
      setView('practice');
    },
    [update],
  );

  // Reopen the last song once saved settings are in.
  useEffect(() => {
    if (!loaded || restored.current) return;
    restored.current = true;
    const id = settings.songId;
    if (id) queueMicrotask(() => void loadSong(id));
  }, [loaded, settings.songId, loadSong]);

  useEffect(() => {
    if (view !== 'practice') return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
      if (e.repeat || interactive(e.target) || status === 'running') return;
      e.preventDefault();
      play();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [view, status, play]);

  const format = song ? 'falling' : settings.format;
  const plan = programs.find((p) => p.id === activeProgram(settings))!;
  const title = songSession ? songSession.name : plan.name;
  const stageProps = {
    settings,
    song: songSession,
    status,
    title,
    onStatus: setStatus,
    onComplete: complete,
  };

  return (
    <div
      className={`${s.root} ${display.variable} ${text.variable}`}
      data-theme={settings.theme}
      data-ready={loaded || undefined}
    >
      <header className={s.header}>
        <p className={s.brand}>
          <span className={s.wordmark}>Dextra</span>
          <span className={s.tagline}>six keys, one hand</span>
        </p>
        <nav className={s.nav} aria-label="Dextra">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => show(v.id)}
            >
              {v.label}
              {v.id === 'records' && history.length > 0 && (
                <span className={s.count}>{history.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className={s.headerEnd}>
          {view === 'practice' && fullscreenSupported && (
            <button
              type="button"
              className={s.iconButton}
              onClick={() => void toggleFullscreen()}
              aria-label={
                fullscreenActive ? 'Leave full screen' : 'Full screen'
              }
              title={fullscreenActive ? 'Leave full screen' : 'Full screen'}
            >
              <Icon name={fullscreenActive ? 'exitFullscreen' : 'fullscreen'} />
            </button>
          )}
          <Link className={s.exit} href="/concepts/dextra/overview">
            About
          </Link>
        </div>
      </header>

      <main className={s.main}>
        <div
          ref={fullscreenTarget}
          className={s.practice}
          hidden={view !== 'practice'}
          data-fullscreen={fullscreenActive || undefined}
        >
          <div ref={playButton} className={s.consoleSlot}>
            <Console
              settings={settings}
              update={updateRun}
              status={status}
              song={songSession}
              songNotice={songNotice}
              history={history}
              reduced={reduced}
              onPlay={play}
              onEnd={end}
              onLibrary={() => show('library')}
              onUnloadSong={unloadSong}
              onSetup={() => show('setup')}
            />
          </div>
          <div className={s.stageSlot}>
            <div hidden={!!result} className={s.stageHost}>
              {format === 'falling' ? (
                <FallingStage
                  key={songSession ? `song-${songSession.id}` : 'plan'}
                  ref={stage}
                  {...stageProps}
                />
              ) : (
                <StaticStage ref={stage} {...stageProps} />
              )}
            </div>
            {result && (
              <ResultPanel
                ref={resultPanel}
                result={result}
                history={history}
                settings={settings}
                onAgain={start}
                onBack={() => {
                  setResult(null);
                  setStatus('idle');
                }}
                onRecords={() => show('records')}
              />
            )}
          </div>
          <p className={s.keyboardNote}>
            Scored play needs a physical keyboard. You can still browse and set
            up practice here.
          </p>
        </div>

        {view === 'library' && (
          <LibraryView
            settings={settings}
            history={history}
            busy={busy}
            songs={library.songs}
            songsAvailable={library.available}
            job={library.job}
            loadedSongId={song?.id ?? null}
            loadingSongId={loadingSongId}
            onLoadPlan={loadPlan}
            onImport={(file) =>
              void library.importFile(file).then((id) => {
                if (id) void loadSong(id);
              })
            }
            onDismissJob={library.dismissJob}
            onLoadSong={(id) => void loadSong(id)}
            onRemoveSong={(id) => {
              if (song?.id === id) unloadSong();
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
        {view === 'records' && (
          <RecordsView
            history={history}
            settings={settings}
            onClear={clearHistory}
            onPractice={() => show('practice')}
          />
        )}
        {view === 'setup' && (
          <SetupView
            settings={settings}
            update={updateRun}
            locked={busy}
            onEndRun={() => setStatus('idle')}
          />
        )}
      </main>
    </div>
  );
}
