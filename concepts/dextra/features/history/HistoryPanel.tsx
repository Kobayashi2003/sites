import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Result } from '../../model/training';
import type { RecordConfiguration } from '../../model/records';
import {
  bestRecord,
  configurationKey,
  configurationSummary,
  filterRecords,
  hanonSummary,
  practiceRating,
  ratingText,
  recordExerciseKey,
  sessionLabel,
} from '../../engine/records';
import type { HistoryFilter } from '../../engine/records';
import { keyLabel, fingers } from '../../model/training';
import Select from '../../components/ui/Select';
import RatingGuide from './RatingGuide';
import s from './HistoryPanel.module.css';

const all: HistoryFilter = {
  format: 'all',
  session: 'all',
  exercise: 'all',
  configuration: 'all',
};
const ESTIMATED_RECORD_HEIGHT = 132;
const ESTIMATED_HANON_HEIGHT = 162;
const VIRTUAL_OVERSCAN = 300;

function VirtualRow({
  itemKey,
  top,
  onHeight,
  children,
}: {
  itemKey: string;
  top: number;
  onHeight: (key: string, height: number) => void;
  children: ReactNode;
}) {
  const row = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    const node = row.current;
    if (!node) return;
    const report = () => onHeight(itemKey, node.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [itemKey, onHeight]);
  return (
    <li
      ref={row}
      className={s.virtualRow}
      style={{ transform: `translateY(${top}px)` }}
    >
      {children}
    </li>
  );
}

function buildVirtualLayout(
  records: Result[],
  measuredHeights: ReadonlyMap<string, number>,
) {
  let top = 0;
  const items = records.map((record) => {
    const key =
      record.id ??
      `${record.date}-${record.mode}-${record.hits}-${record.total}-${record.accuracy}`;
    const height =
      measuredHeights.get(key) ??
      (record.hanon ? ESTIMATED_HANON_HEIGHT : ESTIMATED_RECORD_HEIGHT);
    const item = { record, key, top, height };
    top += height;
    return item;
  });
  return { items, height: top };
}

function firstVisible(
  items: { top: number; height: number }[],
  target: number,
) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const item = items[middle];
    if (item.top + item.height < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

export default function HistoryPanel({
  history,
  current,
  initialScope,
  onReview,
}: {
  history: Result[];
  current: RecordConfiguration;
  initialScope: string;
  onReview: (result: Result) => void;
}) {
  const [filter, setFilter] = useState({ ...all, configuration: initialScope });
  const [sort, setSort] = useState('recent');
  const viewport = useRef<HTMLDivElement>(null);
  const [measuredHeights, setMeasuredHeights] = useState(
    () => new Map<string, number>(),
  );
  const [viewportState, setViewportState] = useState({ top: 0, height: 480 });
  const configurations = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        exercise: string;
        config: RecordConfiguration;
        best: Result | null;
      }
    >();
    for (const r of history) {
      const key = configurationKey(r.configuration);
      if (!key) continue;
      const entry = map.get(key);
      map.set(key, {
        name: r.mode,
        exercise: recordExerciseKey(r),
        config: r.configuration!,
        best: bestRecord([...(entry?.best ? [entry.best] : []), r]),
      });
    }
    return map;
  }, [history]);
  const rows = useMemo(
    () => filterRecords(history, filter, current),
    [current, filter, history],
  );
  const selectedKey =
    filter.configuration === 'current'
      ? configurationKey(current)
      : filter.configuration;
  const selected =
    filter.configuration === 'current'
      ? current
      : configurations.get(selectedKey ?? '')?.config;
  const best = selected ? configurations.get(selectedKey!)?.best : null;
  const ranked = !!selected;
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        sort === 'rating' && ranked
          ? (practiceRating(b)?.value ?? -Infinity) -
              (practiceRating(a)?.value ?? -Infinity) ||
            Date.parse(b.date) - Date.parse(a.date)
          : (sort === 'oldest' ? 1 : -1) *
            (Date.parse(a.date) - Date.parse(b.date)),
      ),
    [ranked, rows, sort],
  );
  const configurationOptions = useMemo(
    () =>
      [...configurations]
        .filter(([, entry]) => {
          const config = entry.config;
          return (
            (filter.format === 'all' || config.format === filter.format) &&
            (filter.session === 'all' ||
              sessionLabel(config.format, config.challenge) ===
                filter.session) &&
            (filter.exercise === 'all' || entry.exercise === filter.exercise)
          );
        })
        .map(([value, entry], index) => ({ value, entry, index })),
    [configurations, filter.exercise, filter.format, filter.session],
  );
  const virtualLayout = useMemo(
    () => buildVirtualLayout(sorted, measuredHeights),
    [measuredHeights, sorted],
  );
  const virtualStart = Math.max(0, viewportState.top - VIRTUAL_OVERSCAN);
  const virtualEnd =
    viewportState.top + viewportState.height + VIRTUAL_OVERSCAN;
  const firstVisibleIndex = firstVisible(virtualLayout.items, virtualStart);
  let lastVisibleIndex = firstVisibleIndex;
  while (
    lastVisibleIndex < virtualLayout.items.length &&
    virtualLayout.items[lastVisibleIndex].top <= virtualEnd
  )
    lastVisibleIndex += 1;
  const visibleRecords = virtualLayout.items.slice(
    firstVisibleIndex,
    lastVisibleIndex,
  );
  const measureRow = useCallback((key: string, height: number) => {
    const rounded = Math.ceil(height);
    setMeasuredHeights((values) => {
      if (values.get(key) === rounded) return values;
      const next = new Map(values);
      next.set(key, rounded);
      return next;
    });
  }, []);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const update = () =>
      setViewportState((value) => ({
        ...value,
        height: node.clientHeight,
      }));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [sorted.length]);
  const resetList = useCallback(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
    setViewportState((value) => ({ ...value, top: 0 }));
  }, []);
  const exercises = [
    ...new Map(history.map((r) => [recordExerciseKey(r), r.mode])).entries(),
  ];
  function change(field: keyof HistoryFilter, value: string) {
    resetList();
    setFilter((v) => ({
      ...v,
      [field]: value,
      ...(field !== 'configuration' ? { configuration: 'all' } : {}),
    }));
    setSort('recent');
  }
  return (
    <div className={s.panel}>
      <p className={s.intro}>
        Find a routine, follow your progress. Personal bests compare the same
        exercise and difficulty settings.
      </p>
      <div className={s.scope}>
        <button
          aria-pressed={filter.configuration === 'all'}
          onClick={() => {
            resetList();
            setFilter(all);
            setSort('recent');
          }}
        >
          All records
        </button>
        <button
          aria-pressed={filter.configuration === 'current'}
          onClick={() => {
            resetList();
            setFilter({ ...all, configuration: 'current' });
            setSort('recent');
          }}
        >
          Current configuration
        </button>
      </div>
      <div className={s.filters}>
        <div className={s.filterField}>
          <span>Format</span>
          <Select
            label="Format"
            value={filter.format}
            onChange={(value) => change('format', value)}
            options={[
              { value: 'all', label: 'All formats' },
              { value: 'falling', label: 'Falling' },
              { value: 'static', label: 'Static' },
            ]}
          />
        </div>
        <div className={s.filterField}>
          <span>Session</span>
          <Select
            label="Session"
            value={filter.session}
            onChange={(value) => change('session', value)}
            options={[
              { value: 'all', label: 'All sessions' },
              { value: 'Fixed', label: 'Fixed' },
              { value: 'Timed', label: 'Timed' },
              { value: 'Survival', label: 'Survival' },
            ]}
          />
        </div>
        <div className={`${s.filterField} ${s.exerciseField}`}>
          <span>Exercise</span>
          <Select
            label="Exercise"
            value={filter.exercise}
            onChange={(value) => change('exercise', value)}
            options={[
              { value: 'all', label: 'All exercises' },
              ...exercises.map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
        <div className={`${s.filterField} ${s.configurationField}`}>
          <span>Configuration</span>
          <Select
            label="Configuration"
            value={filter.configuration}
            onChange={(value) => change('configuration', value)}
            options={[
              { value: 'all', label: 'All configurations' },
              { value: 'current', label: 'Current configuration' },
              {
                value: 'legacy',
                label: 'Configuration unavailable',
              },
              ...configurationOptions.map(({ value, entry, index }) => ({
                value,
                label: `#${index + 1} · ${entry.name} · ${configurationSummary(entry.config)}`,
              })),
            ]}
          />
        </div>
      </div>
      {selected && (
        <section
          className={s.configuration}
          aria-label="Selected configuration"
        >
          <span className={s.eyebrow}>CONFIGURATION BEST</span>
          <strong>
            {best ? ratingText(practiceRating(best)) : 'No benchmark yet'}
          </strong>
          <p>{configurationSummary(selected)}</p>
          <details>
            <summary>Keys & fingers</summary>
            <p>
              {selected.keys
                .map(
                  (key, i) =>
                    `${keyLabel(key)}: ${fingers[selected.mapping[i]]}`,
                )
                .join(' · ')}
            </p>
          </details>
        </section>
      )}
      <div className={s.listHead}>
        <output aria-live="polite">
          {rows.length} of {history.length} records
        </output>
        <div className={s.sortField}>
          <span>Sort</span>
          <Select
            label="Sort"
            value={sort}
            onChange={(value) => {
              resetList();
              setSort(value);
            }}
            options={[
              { value: 'recent', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'rating', label: 'Best rating', disabled: !ranked },
            ]}
          />
        </div>
      </div>
      {!ranked && (
        <p className={s.hint}>
          Select one configuration to sort by rating. Different modes use
          different units.
        </p>
      )}
      {sorted.length > 0 ? (
        <div
          ref={viewport}
          className={s.recordsViewport}
          onScroll={(event) => {
            const top = event.currentTarget.scrollTop;
            setViewportState((value) => ({ ...value, top }));
          }}
        >
          <ol
            className={s.virtualTrack}
            aria-label="History records"
            style={{ height: virtualLayout.height }}
          >
            {visibleRecords.map(({ record: r, key: itemKey, top }) => {
              const configKey = configurationKey(r.configuration);
              const rating = practiceRating(r);
              const groupBest = configKey
                ? configurations.get(configKey)?.best
                : null;
              const personalBest =
                groupBest &&
                rating &&
                rating.value === practiceRating(groupBest)?.value;
              return (
                <VirtualRow
                  key={itemKey}
                  itemKey={itemKey}
                  top={top}
                  onHeight={measureRow}
                >
                  <button className={s.record} onClick={() => onReview(r)}>
                    <span className={s.recordTop}>
                      <strong>{r.mode}</strong>
                      <b>{ratingText(rating)}</b>
                    </span>
                    {r.hanon && (
                      <span className={s.recordSequence}>
                        {hanonSummary(r.hanon, r.format !== 'static')}
                      </span>
                    )}
                    <span className={s.recordMeta}>
                      {r.format === 'static' ? 'Static' : 'Falling'} ·{' '}
                      {sessionLabel(r.format, r.challenge)} ·{' '}
                      {r.challenge === 'endless'
                        ? `${r.limit ?? '?'}${r.format === 'static' ? 's' : ' lives'}`
                        : r.format === 'static'
                          ? `${((r.durationMs ?? 0) / 1000).toFixed(2)}s`
                          : `${r.bpm} BPM`}{' '}
                      · {r.accuracy}% accuracy
                    </span>
                    <span className={s.recordBottom}>
                      <time dateTime={r.date}>
                        {new Date(r.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      {personalBest ? (
                        <span className={s.best}>Personal best</span>
                      ) : !configKey ? (
                        <span>Configuration unavailable</span>
                      ) : (
                        <span>View result ↗</span>
                      )}
                    </span>
                  </button>
                </VirtualRow>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className={s.empty}>
          <strong>
            {history.length ? 'No matching runs' : 'Your first run starts here'}
          </strong>
          <p>
            {history.length
              ? 'Try a different filter, or complete a run with this configuration.'
              : 'Finish a practice session to create a record and set your first benchmark.'}
          </p>
          {history.length > 0 && (
            <button
              onClick={() => {
                resetList();
                setFilter(all);
                setSort('recent');
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}
      <RatingGuide />
    </div>
  );
}
