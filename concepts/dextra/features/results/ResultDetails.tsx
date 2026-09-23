import {
  practiceRating,
  configurationSummary,
  validConfiguration,
} from '../../engine/records';
import { fingers, keyLabel } from '../../model/training';
import BenchmarkNotice from '../history/BenchmarkNotice';
import RatingGuide from '../history/RatingGuide';
import type { Result } from '../../model/training';
import { validHanon } from '../../engine/hanon';
import s from './ResultDetails.module.css';

const seconds = (ms = 0, digits = 2) => `${(ms / 1000).toFixed(digits)}`;

export default function ResultDetails({
  result,
  history,
}: {
  result: Result;
  history: Result[];
}) {
  const rating = practiceRating(result);
  const j = result.judgements;
  const valid =
    j &&
    [
      'perfect',
      'good',
      'misses',
      'extras',
      'best',
      'early',
      'late',
      'meanOffset',
      'meanAbsoluteOffset',
    ].every((key) => Number.isFinite(j[key as keyof typeof j]));
  const scored = result.format !== 'static' && Number.isFinite(result.score);
  const survival = result.challenge === 'endless';
  return (
    <>
      {validHanon(result.hanon) && (
        <p className={s.motionNote}>
          Hanon {result.hanon.queue.join(' → ')} · {result.hanon.repeat}× · 1/
          {result.hanon.division} ·{' '}
          {result.hanon.traversal === 'both'
            ? 'Ascending + descending'
            : result.hanon.traversal === 'up'
              ? 'Ascending'
              : 'Descending'}
        </p>
      )}
      <div className={s.resultScore}>
        <strong className={s.ratingValue}>
          {rating
            ? rating.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
            : '—'}
          {rating && <small>{rating.unit}</small>}
        </strong>
        <span>{rating?.label ?? 'Rating unavailable'}</span>
      </div>
      <BenchmarkNotice result={result} history={history} />
      <dl className={s.resultStats}>
        {scored && (
          <div>
            <dt>Arcade points {result.rank ? '· ' + result.rank : ''}</dt>
            <dd>{result.score!.toLocaleString('en-US')}</dd>
          </div>
        )}
        {result.format === 'static' && (
          <div>
            <dt>Active time</dt>
            <dd>{seconds(result.durationMs)}s</dd>
          </div>
        )}
        {(scored || result.format === 'static') && (
          <div>
            <dt>Accuracy</dt>
            <dd>{result.accuracy}%</dd>
          </div>
        )}
        {result.format === 'static' ? (
          <>
            <div>
              <dt>Errors</dt>
              <dd>{result.errors ?? 0}</dd>
            </div>
            <div>
              <dt>Groups</dt>
              <dd>
                {survival ? result.hits : `${result.hits}/${result.total}`}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Tempo</dt>
              <dd>{result.bpm} BPM</dd>
            </div>
            <div>
              <dt>{survival ? 'Survived' : 'Groups'}</dt>
              <dd>
                {survival
                  ? `${seconds(result.durationMs, 1)}s`
                  : `${result.hits}/${result.total}`}
              </dd>
            </div>
          </>
        )}
        {valid && (
          <div>
            <dt>Best combo</dt>
            <dd>{j.best}</dd>
          </div>
        )}
      </dl>
      {valid && (
        <>
          <div className={s.resultGrades}>
            {(
              [
                ['perfect', 'Pure', j.perfect],
                ['good', 'Far', j.good],
                ['miss', 'Miss', j.misses],
                ['extra', 'Extra', j.extras],
              ] as const
            ).map(([grade, label, value]) => (
              <div key={grade} data-grade={grade}>
                <span>{label}</span>
                <strong>{value}</strong>
                {grade === 'perfect' && !!j.pureplus && (
                  <small data-grade="pureplus">{j.pureplus} Pure+</small>
                )}
              </div>
            ))}
          </div>
          <dl className={s.resultTiming}>
            <div>
              <dt>Early / Late</dt>
              <dd>
                {j.early} / {j.late}
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
          </dl>
        </>
      )}
      <p className={s.resultContext}>
        {[
          result.format === 'static' ? 'Static' : 'Falling',
          survival
            ? result.format === 'static'
              ? `${result.limit}s timed random`
              : `Survival · ${result.limit} lives`
            : 'Standard chart',
          result.windows &&
            result.format !== 'static' &&
            `Pure ±${result.windows.perfect} ms · Far ±${result.windows.good} ms`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <RatingGuide />
      {validConfiguration(result.configuration) && (
        <details className={s.configurationDisclosure}>
          <summary>Recorded configuration</summary>
          <p>{configurationSummary(result.configuration)}</p>
          <p>
            {result.configuration.keys
              .map(
                (key, i) =>
                  `${keyLabel(key)}: ${fingers[result.configuration!.mapping[i]]}`,
              )
              .join(' · ')}
          </p>
        </details>
      )}
      {!valid && result.format !== 'static' && (
        <p className={s.resultContext}>
          This older session has no detailed timing breakdown.
        </p>
      )}
    </>
  );
}
