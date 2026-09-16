import type { Result } from '../../model/training';
import s from '../../styles.module.css';
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
  return (
    <>
      <div className={s.resultScore}>
        <strong>
          {result.format === 'static'
            ? ((result.durationMs ?? 0) / 1000).toFixed(2)
            : result.accuracy}
          <small>{result.format === 'static' ? 's' : '%'}</small>
        </strong>
        <span>{result.format === 'static' ? 'Active time' : 'Accuracy'}</span>
      </div>
      <p className={s.resultContext}>
        {result.mode}
        <br />
        {result.format === 'static'
          ? 'Static'
          : `${result.bpm} BPM · Falling`}{' '}
        ·{' '}
        {result.challenge === 'endless'
          ? `${result.hits} groups`
          : `${result.hits}/${result.total} groups`}
      </p>
      {result.format === 'static' && (
        <dl className={s.resultTiming}>
          <div>
            <dt>Accuracy</dt>
            <dd>{result.accuracy}%</dd>
          </div>
          <div>
            <dt>Errors</dt>
            <dd>{result.errors ?? 0}</dd>
          </div>
          <div>
            <dt>Error rate</dt>
            <dd>{result.errorRate ?? 0}%</dd>
          </div>
        </dl>
      )}
      {result.format === 'falling' && result.challenge === 'endless' && (
        <p className={s.resultContext}>
          Survived {((result.durationMs ?? 0) / 1000).toFixed(2)}s ·{' '}
          {result.limit} lives
        </p>
      )}
      {result.windows && (
        <p className={s.resultContext}>
          Perfect ±{result.windows.perfect} ms · Good ±{result.windows.good} ms
        </p>
      )}
      {valid && (
        <>
          <div className={s.resultGrades}>
            {[
              ['Perfect', j.perfect],
              ['Good', j.good],
              ['Miss', j.misses],
              ['Extra', j.extras],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <dl className={s.resultTiming}>
            <div>
              <dt>Best streak</dt>
              <dd>{j.best}</dd>
            </div>
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
      {!valid && result.format !== 'static' && (
        <p className={s.resultContext}>
          This older session has no detailed timing breakdown.
        </p>
      )}
    </>
  );
}
