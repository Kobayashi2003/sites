import Icon from './Icon';
import s from './LifeMeter.module.css';

/** Remaining survival lives as a row of hearts, with a text equivalent. */
export default function LifeMeter({
  lives,
  limit,
}: {
  lives: number;
  limit: number;
}) {
  const left = Math.max(0, lives);
  return (
    <span
      className={s.lifeMeter}
      data-low={left <= Math.max(1, Math.floor(limit / 4)) || undefined}
    >
      <span className={s.srOnly}>
        {left} of {limit} lives left
      </span>
      {Array.from({ length: limit }, (_, i) => (
        <span key={i} aria-hidden="true" data-lost={i >= left || undefined}>
          <Icon name="heart" />
        </span>
      ))}
    </span>
  );
}
