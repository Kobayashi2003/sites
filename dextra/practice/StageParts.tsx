import type { ReactNode } from 'react';
import type { LaneColor } from '../model/settings';
import { Keycap } from '../ui/Keycap';
import p from './practice.module.css';

/** The dark inset the chart plays on, with an optional progress rule. */
export function Display({
  progress,
  children,
}: {
  progress: number | null;
  children: ReactNode;
}) {
  return (
    <div className={p.display}>
      {progress !== null && (
        <span
          className={p.progress}
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

/** Centered message over the chart; `quiet` drops the backing panel. */
export function Overlay({
  quiet,
  children,
}: {
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={p.overlay} data-quiet={quiet || undefined}>
      <div>{children}</div>
    </div>
  );
}

export function KeyRow({
  keys,
  mapping,
  colors,
  held,
}: {
  keys: string[];
  mapping: number[];
  colors: LaneColor[];
  held?: Set<number>;
}) {
  return (
    <div className={p.keys} aria-label="Lane keys">
      {keys.map((code, lane) => (
        <Keycap
          key={code}
          code={code}
          finger={mapping[lane]}
          color={colors[lane]}
          pressed={held?.has(lane)}
        />
      ))}
    </div>
  );
}
