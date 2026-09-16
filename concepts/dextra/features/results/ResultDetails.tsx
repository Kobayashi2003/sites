import type { Result } from '../../model/training';
import s from '../../styles.module.css';

const seconds = (ms = 0, digits = 2) => `${(ms / 1000).toFixed(digits)}`;

export default function ResultDetails({ result }: { result: Result }) {
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
      <div className={s.resultScore}>
        {result.rank && (
          <span className={s.resultRank} data-rank={result.rank}>
            {result.rank}
          </span>
        )}
        <strong>
          {result.format === 'static' ? (
            survival ? (
              <>
                {result.hits}
                <small> groups</small>
              </>
            ) : (
              <>
                {seconds(result.durationMs)}
                <small>s</small>
              </>
            )
          ) : scored ? (
            result.score!.toLocaleString('en-US')
          ) : (
            <>
              {result.accuracy}
              <small>%</small>
            </>
          )}
        </strong>
        <span>
          {result.format === 'static'
            ? survival
              ? `Cleared in ${result.limit}s`
              : 'Active time'
            : scored
              ? result.maxScore
                ? `Score · ${Math.round((result.score! / result.maxScore) * 100)}% of max`
                : 'Score'
              : 'Accuracy'}
        </span>
      </div>
      <dl className={s.resultStats}>
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
            {[
              ['Pure', j.perfect, j.pureplus ? `${j.pureplus} Pure+` : ''],
              ['Far', j.good, ''],
              ['Miss', j.misses, ''],
              ['Extra', j.extras, ''],
            ].map(([label, value, note]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                {note && <small>{note}</small>}
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
      {!valid && result.format !== 'static' && (
        <p className={s.resultContext}>
          This older session has no detailed timing breakdown.
        </p>
      )}
    </>
  );
}
