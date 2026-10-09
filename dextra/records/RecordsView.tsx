import { useMemo, useState } from 'react';
import type { LaneResult, Result } from '../model/training';
import type { Settings } from '../model/settings';
import { formatRecord, recordKey } from '../model/records';
import { LaneBreakdown } from '../practice/LaneBreakdown';
import { outcome, ResultDetails } from '../practice/ResultPanel';
import ui from '../styles.module.css';
import TrendChart from './TrendChart';
import type { TrendPoint } from './TrendChart';
import r from './records.module.css';

const TREND_RUNS = 30;
const ALL = 'all';

const when = (date: string) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** A setup described the way the console offers it. */
function setupName(run: Result) {
  const falling = run.format !== 'static';
  const how = run.songId
    ? `${run.difficulty ?? 'normal'} song chart`
    : run.challenge === 'endless'
      ? falling
        ? `survival, ${run.limit} ${run.limit === 1 ? 'life' : 'lives'}`
        : `${run.limit} s timed`
      : falling
        ? `${run.bpm} BPM`
        : 'static';
  return `${run.mode}, ${falling && !run.songId && run.challenge !== 'endless' ? 'falling at ' : ''}${how}`;
}

/** The number charted for a run, and its unit. */
function trendValue(run: Result): [number, string] {
  if (run.format === 'static')
    return run.challenge === 'endless'
      ? [run.hits, '']
      : [Math.round((run.durationMs ?? 0) / 100) / 10, ' s'];
  if (run.maxScore && run.score !== undefined)
    return [Math.round((run.score / run.maxScore) * 1000) / 10, '%'];
  return [run.accuracy, '%'];
}

function combineLanes(runs: Result[]): LaneResult[] | null {
  const withLanes = runs.filter((run) => run.lanes);
  if (!withLanes.length) return null;
  return Array.from({ length: 6 }, (_, i) => {
    let hits = 0;
    let misses = 0;
    let extras = 0;
    let offsetSum = 0;
    let offsetHits = 0;
    for (const run of withLanes) {
      const lane = run.lanes![i];
      hits += lane.hits;
      misses += lane.misses;
      extras += lane.extras;
      if (lane.meanOffset !== null) {
        offsetSum += lane.meanOffset * lane.hits;
        offsetHits += lane.hits;
      }
    }
    return {
      hits,
      misses,
      extras,
      meanOffset: offsetHits ? Math.round(offsetSum / offsetHits) : null,
    };
  });
}

export default function RecordsView({
  history,
  settings,
  onClear,
  onPractice,
}: {
  history: Result[];
  settings: Settings;
  onClear: () => void;
  onPractice: () => void;
}) {
  const setups = useMemo(() => {
    const seen = new Map<string, { name: string; runs: Result[] }>();
    for (const run of history) {
      const key = recordKey(run);
      const entry = seen.get(key) ?? { name: setupName(run), runs: [] };
      entry.runs.push(run);
      seen.set(key, entry);
    }
    return seen;
  }, [history]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Result | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Default to the setup of the latest run, the one most likely to matter.
  const filter =
    chosen && (chosen === ALL || setups.has(chosen))
      ? chosen
      : history[0]
        ? recordKey(history[0])
        : ALL;
  const runs = filter === ALL ? history : (setups.get(filter)?.runs ?? []);
  const focus = selected && runs.includes(selected) ? selected : null;
  const totalMs = history.reduce((sum, run) => sum + (run.durationMs ?? 0), 0);
  const minutes = Math.round(totalMs / 60000);

  if (!history.length)
    return (
      <div className={r.empty}>
        <h2>No runs yet</h2>
        <p>
          Finished runs land here with their score, timing and a breakdown for
          every finger, so you can see which one is holding the others back.
        </p>
        <button type="button" className={ui.primary} onClick={onPractice}>
          Go to the chart
        </button>
      </div>
    );

  const trendRuns = runs.slice(0, TREND_RUNS).reverse();
  const [, unit] = trendRuns.length ? trendValue(trendRuns[0]) : [0, ''];
  const points: TrendPoint[] = trendRuns.map((run) => {
    const [value] = trendValue(run);
    return { value, display: `${value}${unit}`, label: when(run.date) };
  });
  const sample = runs[0];
  const metric =
    sample?.format === 'static'
      ? sample.challenge === 'endless'
        ? 'Groups cleared'
        : 'Active time, lower is better'
      : sample?.maxScore
        ? 'Score as a share of the maximum'
        : 'Accuracy';
  const lanes = combineLanes(
    runs.filter(
      (run) => (run.format === 'static') === (sample?.format === 'static'),
    ),
  );

  return (
    <div className={r.records}>
      <header className={r.head}>
        <div>
          <h2>Records</h2>
          <p>
            {history.length} {history.length === 1 ? 'run' : 'runs'} and{' '}
            {minutes < 1 ? 'under a minute' : `${minutes} min`} of play on this
            device.
          </p>
        </div>
        <label className={r.filter}>
          <span className={ui.fieldLabel}>Setup</span>
          <select
            className={ui.select}
            value={filter}
            onChange={(e) => {
              setChosen(e.target.value);
              setSelected(null);
            }}
          >
            {[...setups].map(([key, { name, runs }]) => (
              <option key={key} value={key}>
                {name} ({runs.length})
              </option>
            ))}
            <option value={ALL}>Every run ({history.length})</option>
          </select>
        </label>
      </header>

      <div className={r.layout}>
        <div className={r.main}>
          {filter !== ALL ? (
            <TrendChart points={points} unit={unit} title={metric} />
          ) : (
            <p className={r.chartEmpty}>
              Choose one setup to see its trend; runs with different charts or
              tempos are not comparable.
            </p>
          )}
          {lanes && (
            <section className={r.fingers} aria-labelledby="dextra-fingers">
              <h3 id="dextra-fingers">
                Fingers across {filter === ALL ? 'every run' : 'these runs'}
              </h3>
              <LaneBreakdown
                lanes={lanes}
                keys={settings.keys}
                mapping={settings.mapping}
                colors={settings.colors}
                timed={sample?.format !== 'static'}
              />
            </section>
          )}
          <section aria-labelledby="dextra-runs">
            <h3 id="dextra-runs" className={r.listTitle}>
              Runs, newest first
            </h3>
            <ol className={r.runs}>
              {runs.map((run, i) => (
                <li key={`${run.date}-${i}`}>
                  <button
                    type="button"
                    aria-pressed={run === focus}
                    onClick={() => setSelected(run === focus ? null : run)}
                  >
                    <span className={r.runWhen}>{when(run.date)}</span>
                    <span className={r.runName}>
                      {filter === ALL ? setupName(run) : outcome(run)}
                    </span>
                    <span className={r.runValue}>
                      {run.rank && <i data-rank={run.rank}>{run.rank}</i>}
                      {formatRecord(run)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className={r.detail} aria-label="Run details">
          {focus ? (
            <>
              <header className={r.detailHead}>
                <h3>{focus.mode}</h3>
                <p>
                  {outcome(focus)} on {when(focus.date)}
                </p>
                <button
                  type="button"
                  className={ui.quiet}
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </header>
              <ResultDetails
                result={focus}
                history={history}
                settings={settings}
              />
            </>
          ) : (
            <p className={r.detailEmpty}>
              Pick a run to read its full breakdown.
            </p>
          )}
        </aside>
      </div>

      <footer className={r.danger}>
        {confirmClear ? (
          <>
            <p>
              Delete all {history.length} runs from this browser? This cannot be
              undone.
            </p>
            <button
              type="button"
              className={ui.button}
              data-tone="danger"
              onClick={() => {
                setConfirmClear(false);
                onClear();
              }}
            >
              Delete every run
            </button>
            <button
              type="button"
              className={ui.quiet}
              onClick={() => setConfirmClear(false)}
            >
              Keep them
            </button>
          </>
        ) : (
          <button
            type="button"
            className={ui.quiet}
            onClick={() => setConfirmClear(true)}
          >
            Clear history
          </button>
        )}
      </footer>
    </div>
  );
}
