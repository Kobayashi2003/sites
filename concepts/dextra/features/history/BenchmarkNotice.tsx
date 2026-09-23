import type { Result } from '../../model/training';
import { benchmark, ratingText } from '../../engine/records';
import s from './BenchmarkNotice.module.css';

export default function BenchmarkNotice({
  result,
  history,
}: {
  result: Result;
  history: Result[];
}) {
  const record = benchmark(result, history);
  if (!record)
    return (
      <p className={s.legacy}>
        This record has incomplete configuration or scoring data. It does not
        participate in personal bests.
      </p>
    );
  const title =
    record.status === 'first'
      ? 'First benchmark'
      : record.status === 'new'
        ? 'New personal best'
        : record.status === 'tied'
          ? 'Matched personal best'
          : 'Keep building';
  return (
    <div className={s.benchmark} data-best={record.isBest} aria-live="polite">
      <strong className={s.milestone}>{title}</strong>
      <span>
        {record.status === 'first'
          ? 'Your first completed run with this configuration.'
          : record.status === 'new'
            ? `+${record.improvement} ${record.rating.unit === '%' ? 'percentage points' : record.rating.unit} over your previous best.`
            : record.status === 'tied'
              ? 'Equal to the best score before this run.'
              : 'Every configuration has its own benchmark.'}
      </span>
      {!record.isBest && (
        <div className={s.bestComparison}>
          <span>Configuration best</span>
          <b>{ratingText(record.best)}</b>
          {!record.isBest && record.status !== 'below' && (
            <small>This earlier milestone has since been beaten.</small>
          )}
        </div>
      )}
    </div>
  );
}
