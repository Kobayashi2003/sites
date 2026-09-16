'use client';
import ResizableDivider from './ResizableDivider';
import { usePanelWidths } from '../../hooks/usePanelWidths';
import type { CSSProperties } from 'react';

import { PracticeAppearance } from '../../features/settings/PracticeAppearance';
import useFullscreen from '../../hooks/useFullscreen';
import { StageContext } from './StageContext';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { lockScroll } from '../../lib/lockScroll';
import Select from '../ui/Select';
import StaticTrainer from '../../features/static/StaticTrainer';
import FallingTrainer from '../../features/falling/FallingTrainer';
import { programs } from '../../engine/rhythm';
import type { ProgramId } from '../../engine/rhythm';
import { defaults, defaultFingers, keyOptions } from '../../model/training';
import type { Result, Status } from '../../model/training';
import s from '../../styles.module.css';

import LibraryPanel from '../../features/library/LibraryPanel';
import SettingsPanel from '../../features/settings/SettingsPanel';
import ResultDetails from '../../features/results/ResultDetails';
import PracticeGuide from './PracticeGuide';

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
  const { widths, resize } = usePanelWidths();
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
  const {
    panel: stagePanel,
    trigger: stageTrigger,
    expanded: stageExpanded,
    toggle: toggleStage,
  } = useFullscreen(status, setStatus);
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  const [playback, setPlayback] = useState<HTMLDivElement | null>(null);
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
  const trainerPanel = useRef<HTMLDivElement>(null);
  const [resultMinHeight, setResultMinHeight] = useState(0);
  const busy = status === 'running' || status === 'paused';
  const selected = programs.find(
    (p) => p.id === (challenge === 'endless' ? 'random' : program),
  )!;
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
      setResultMinHeight(
        trainerPanel.current?.getBoundingClientRect().height ?? 0,
      );
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
  function again() {
    if (!result) return;
    const match = programs.find((p) => p.name === result.mode);
    setProgram(match?.id ?? 'mixed');
    setFormat(result.format ?? 'falling');
    setDirection(result.direction ?? 'down');
    setChallenge(result.challenge ?? 'standard');
    if (result.format === 'static') setTimeLimit(result.limit ?? 60);
    else {
      setLives(result.limit ?? 3);
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
          if ([30, 60, 120].includes(saved.timeLimit))
            setTimeLimit(saved.timeLimit);
          if ([1, 3, 5].includes(saved.lives)) setLives(saved.lives);
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
  ]);
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
            History <span>{history.length}</span>
          </button>
          <button onClick={() => openDrawer('settings')}>Settings</button>
        </div>
      </header>
      <StageContext.Provider
        value={{
          controls,
          playback,
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
            style={
              {
                '--left-width': `${widths.left}px`,
                '--right-width': `${widths.right}px`,
              } as CSSProperties
            }
          >
            <aside className={s.controlColumn}>
              <div className={s.controlScroll}>
                <section
                  className={s.loadedPlan}
                  aria-label="Loaded training plan"
                >
                  <div>
                    <span className={s.eyebrow}>CURRENT EXERCISE</span>
                    <h2>{selected.name}</h2>
                    <p>
                      {challenge === 'endless'
                        ? format === 'static'
                          ? `${timeLimit}s · Random`
                          : `${lives} lives · Random`
                        : '32 groups'}
                    </p>
                  </div>
                  <button
                    onClick={() => openDrawer('library')}
                    aria-haspopup="dialog"
                  >
                    <Icon name="random" />
                    Change exercise
                  </button>
                </section>
                <div className={s.practiceToolbar}>
                  <div className={s.formatBar} aria-label="Practice format">
                    {(['falling', 'static'] as const).map((value) => (
                      <button
                        key={value}
                        disabled={busy}
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
                  <div className={s.challengeBar}>
                    <span className={s.controlLabel}>Challenge</span>
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
                          label:
                            format === 'static' ? 'Timed random' : 'Survival',
                        },
                      ]}
                      onChange={(v) => {
                        setChallenge(v as typeof challenge);
                        setStatus('idle');
                        setResult(null);
                        setRevision((n) => n + 1);
                      }}
                    />
                    {challenge === 'endless' && (
                      <Select
                        label={format === 'static' ? 'Time limit' : 'Lives'}
                        value={String(format === 'static' ? timeLimit : lives)}
                        disabled={busy}
                        options={(format === 'static'
                          ? [30, 60, 120]
                          : [1, 3, 5]
                        ).map((n) => ({
                          value: String(n),
                          label:
                            format === 'static' ? `${n} seconds` : `${n} lives`,
                        }))}
                        onChange={(v) => {
                          if (format === 'static') setTimeLimit(Number(v));
                          else setLives(Number(v));
                        }}
                      />
                    )}
                  </div>
                  <div className={s.directionControl}>
                    <span className={s.controlLabel}>Scroll direction</span>
                    <Select
                      icon={direction}
                      label="Direction"
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
                </div>
                <div ref={setControls} hidden={!!result} />
              </div>
              <div className={s.controlFooter}>
                <div ref={setPlayback} hidden={!!result} />
                <div className={s.stageUtilities}>
                  <button
                    ref={stageTrigger}
                    data-exit={stageExpanded || undefined}
                    onClick={() => void toggleStage()}
                  >
                    <Icon name={stageExpanded ? 'close' : 'fullscreen'} />
                    {stageExpanded ? 'Exit fullscreen' : 'Fullscreen'}
                  </button>
                  {stageExpanded && (
                    <>
                      <button onClick={() => openDrawer('settings')}>
                        Settings
                      </button>
                      <button onClick={() => openDrawer('history')}>
                        History · {history.length}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </aside>
            <ResizableDivider
              side="left"
              value={widths.left}
              onChange={(value) => resize('left', value)}
            />
            <div className={s.practiceColumn}>
              <div
                className={s.trainerHost}
                ref={trainerPanel}
                hidden={!!result}
              >
                {' '}
                {format === 'falling' ? (
                  <FallingTrainer
                    initialBpm={initialBpm}
                    windows={windows}
                    key={`${program}-${revision}`}
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
                  style={{ minHeight: resultMinHeight || undefined }}
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
                      onClick={again}
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
              value={widths.right}
              onChange={(value) => resize('right', value)}
            />
            <PracticeGuide
              keys={keys}
              mapping={mapping}
              description={selected.description}
              format={format}
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
                          setResultMinHeight(
                            trainerPanel.current?.getBoundingClientRect()
                              .height ?? 0,
                          );
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
                            {new Date(r.date).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            ·{' '}
                            {r.format === 'static'
                              ? `Static · ${r.errorRate ?? 0}% errors`
                              : `${r.bpm} BPM · Falling`}
                          </small>
                        </span>
                        <b>
                          {r.format === 'static'
                            ? `${((r.durationMs ?? 0) / 1000).toFixed(2)}s`
                            : `${r.accuracy}%`}{' '}
                          <span>↗</span>
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
