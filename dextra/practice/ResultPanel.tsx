import type { Ref } from 'react';
import type { Result } from '../model/training';
import type { Settings } from '../model/settings';
import {
  bestRecord,
  formatRecord,
  isPersonalBest,
  recordKey,
} from '../model/records';
import Icon from '../ui/Icon';
import ui from '../styles.module.css';
import { LaneBreakdown } from './LaneBreakdown';
import p from './practice.module.css';

export function outcome(r: Result) {
  if (r.challenge === 'endless')
    return r.format === 'static' ? 'Time is up' : 'Out of lives';
  return 'Chart complete';
}

/** The full read-out of one run; actions are omitted when browsing records. */
export function ResultDetails({
  result,
  history,
  settings,
}: {
  result: Result;
  history: Result[];
  settings: Settings;
}) {
  const j = result.judgements;
  const falling = result.format !== 'static';
  const best = bestRecord(history, recordKey(result));
  const newBest = isPersonalBest(result, history);
  const graded = falling && j && Number.isFinite(j.perfect);
  const judged = graded ? j.perfect + j.good + j.misses : 0;
  const plus = graded ? (j.pureplus ?? 0) : 0;
  const segments = graded
    ? ([
        ['pureplus', 'Pure+', plus],
        ['perfect', 'Pure', j.perfect - plus],
        ['good', 'Far', j.good],
        ['miss', 'Miss', j.misses],
      ] as const)
    : [];
  const ratio =
    result.maxScore && result.score !== undefined
      ? Math.round((result.score / result.maxScore) * 100)
      : null;

  return (
    <div className={p.resultBody}>
      <div className={p.resultHead}>
        {result.rank && (
          <span
            className={p.rank}
            data-rank={result.rank}
            aria-label={`Rank ${result.rank}`}
          >
            {result.rank}
          </span>
        )}
        <div>
          <strong className={p.resultValue}>{formatRecord(result)}</strong>
          <p className={p.resultSub}>
            {falling
              ? ratio !== null
                ? `${ratio}% of the maximum score, ${result.accuracy}% accuracy`
                : `${result.accuracy}% accuracy`
              : result.challenge === 'endless'
                ? `cleared in ${result.limit} seconds, ${result.accuracy}% accuracy`
                : `active time, ${result.accuracy}% accuracy`}
          </p>
          {newBest ? (
            <span className={p.bestBadge}>New personal best</span>
          ) : best && best !== result ? (
            <span className={p.bestNote}>
              Personal best {formatRecord(best)}
            </span>
          ) : null}
        </div>
      </div>

      {graded && (
        <div className={p.grades}>
          <div className={p.gradeBar} aria-hidden="true">
            {segments.map(([grade, , count]) =>
              count ? (
                <i key={grade} data-grade={grade} style={{ flexGrow: count }} />
              ) : null,
            )}
          </div>
          <dl className={p.gradeLegend}>
            {segments.map(([grade, label, count]) => (
              <div key={grade} data-grade={grade}>
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
            ))}
            <div data-grade="extra">
              <dt>Extra</dt>
              <dd>{j.extras}</dd>
            </div>
          </dl>
          <p className={p.gradeNote}>
            {judged} groups judged, best combo {j.best}.
          </p>
        </div>
      )}

      {result.lanes && (
        <LaneBreakdown
          lanes={result.lanes}
          keys={settings.keys}
          mapping={settings.mapping}
          colors={settings.colors}
          timed={falling}
        />
      )}

      <dl className={p.facts}>
        {graded ? (
          <>
            <div>
              <dt>Early and late</dt>
              <dd>
                {j.early} early, {j.late} late
              </dd>
            </div>
            <div>
              <dt>Mean offset</dt>
              <dd>
                {j.meanOffset > 0 ? '+' : ''}
                {j.meanOffset} ms
              </dd>
            </div>
            <div>
              <dt>Mean error</dt>
              <dd>{j.meanAbsoluteOffset} ms</dd>
            </div>
          </>
        ) : !falling ? (
          <>
            <div>
              <dt>Groups</dt>
              <dd>
                {result.challenge === 'endless'
                  ? result.hits
                  : `${result.hits} of ${result.total}`}
              </dd>
            </div>
            <div>
              <dt>Wrong presses</dt>
              <dd>{result.errors ?? 0}</dd>
            </div>
            <div>
              <dt>Error rate</dt>
              <dd>{result.errorRate ?? 0}%</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>Played</dt>
          <dd>
            {falling ? 'Falling' : 'Static'},{' '}
            {result.songId
              ? `${result.difficulty ?? 'normal'} song chart`
              : result.challenge === 'endless'
                ? falling
                  ? `survival with ${result.limit} ${result.limit === 1 ? 'life' : 'lives'}`
                  : `${result.limit} s timed`
                : 'standard chart'}
            {falling && !result.songId ? ` at ${result.bpm} BPM` : ''}
          </dd>
        </div>
        {falling && result.windows && (
          <div>
            <dt>Windows</dt>
            <dd>
              Pure ±{result.windows.perfect} ms, Far ±{result.windows.good} ms
            </dd>
          </div>
        )}
      </dl>
      {!result.lanes && (
        <p className={ui.fieldHint}>
          This run was saved before per-key results were recorded.
        </p>
      )}
    </div>
  );
}

export default function ResultPanel({
  result,
  history,
  settings,
  onAgain,
  onBack,
  onRecords,
  ref,
}: {
  result: Result;
  history: Result[];
  settings: Settings;
  onAgain: () => void;
  onBack: () => void;
  onRecords: () => void;
  ref: Ref<HTMLElement>;
}) {
  return (
    <section
      className={p.result}
      ref={ref}
      tabIndex={-1}
      aria-labelledby="dextra-result-title"
    >
      <header className={p.resultTitle}>
        <h2 id="dextra-result-title">{result.mode}</h2>
        <p>{outcome(result)}</p>
      </header>
      <ResultDetails result={result} history={history} settings={settings} />
      <div className={p.resultActions}>
        <button type="button" className={ui.primary} onClick={onAgain}>
          <Icon name="retry" />
          Play again
          <kbd className={ui.kbdHint}>Enter</kbd>
        </button>
        <button type="button" className={ui.button} onClick={onBack}>
          Back to the chart
        </button>
        <button type="button" className={ui.quiet} onClick={onRecords}>
          See all records
        </button>
      </div>
    </section>
  );
}
