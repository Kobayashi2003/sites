import type { HanonStep } from '../../engine/hanon';
import s from './HanonProgress.module.css';

export default function HanonProgress({
  step,
  total,
  repeat,
}: {
  step?: HanonStep;
  total: number;
  repeat: number;
}) {
  if (!step) return null;
  return (
    <div className={s.progress} aria-live="polite" aria-atomic="true">
      <strong>HANON {step.exercise}</strong>
      <span>
        {step.direction === 'up' ? '↑ Ascending' : '↓ Descending'} ·{' '}
        {step.repetition}/{repeat}
      </span>
      <small>
        Study {step.position + 1}/{total}
      </small>
    </div>
  );
}
