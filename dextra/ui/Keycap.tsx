import type { CSSProperties, ReactNode } from 'react';
import { fingerNumber, fingers, keyLabel } from '../model/training';
import type { LaneColor } from '../model/settings';
import s from '../styles.module.css';

/** CSS variables that carry one lane's colors to everything drawn in it. */
export function laneStyle(color: LaneColor): CSSProperties {
  const alpha = Math.round(color.opacity * 2.55)
    .toString(16)
    .padStart(2, '0');
  return {
    '--lane': color.key,
    '--lane-track': `${color.track}${alpha}`,
  } as CSSProperties;
}

/** A key as the hand meets it: the key, and the finger that plays it. */
export function Keycap({
  code,
  finger,
  color,
  pressed,
  size = 'md',
  children,
}: {
  code: string;
  finger: number;
  color: LaneColor;
  pressed?: boolean;
  size?: 'sm' | 'md';
  children?: ReactNode;
}) {
  return (
    <span
      className={s.keycap}
      data-size={size}
      data-pressed={pressed || undefined}
      style={laneStyle(color)}
    >
      <kbd>{keyLabel(code)}</kbd>
      <span className={s.fingering} title={fingers[finger]}>
        <b aria-hidden="true">{fingerNumber(finger)}</b>
        <span className={size === 'sm' ? s.srOnly : undefined}>
          {fingers[finger]}
        </span>
      </span>
      {children}
    </span>
  );
}
