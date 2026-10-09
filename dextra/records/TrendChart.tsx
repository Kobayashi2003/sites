import { useState } from 'react';
import r from './records.module.css';

export type TrendPoint = { label: string; value: number; display: string };

const W = 640;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

/** One series over successive runs; hover or arrow keys read out a point. */
export default function TrendChart({
  points,
  unit,
  title,
}: {
  points: TrendPoint[];
  unit: string;
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2)
    return (
      <p className={r.chartEmpty}>
        The trend appears after two runs with this setup.
      </p>
    );
  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1);
  const min = lo - span * 0.1;
  const max = hi + span * 0.1;
  const x = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const ticks = [min, (min + max) / 2, max];
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`)
    .join('');
  const shown = active === null ? null : points[active];
  const pick = (clientX: number, box: DOMRect) => {
    const ratio = (clientX - box.left) / box.width;
    const i = Math.round(
      ((ratio * W - PAD.left) / (W - PAD.left - PAD.right)) *
        (points.length - 1),
    );
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <figure className={r.chart}>
      <figcaption className={r.chartTitle}>
        {title}
        <span>
          {points.length} runs, from {points[0].display} to{' '}
          {points.at(-1)!.display}
        </span>
      </figcaption>
      <div className={r.chartFrame}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title}: ${points.length} runs, latest ${points.at(-1)!.display}, best ${Math.max(...values)}${unit}.`}
          tabIndex={0}
          onPointerMove={(e) =>
            pick(e.clientX, e.currentTarget.getBoundingClientRect())
          }
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const step = e.key === 'ArrowLeft' ? -1 : 1;
            setActive((i) =>
              Math.max(
                0,
                Math.min(
                  points.length - 1,
                  (i ?? points.length - 1) + (i === null ? 0 : step),
                ),
              ),
            );
          }}
        >
          {ticks.map((t) => (
            <g key={t} className={r.grid}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {Math.round(t)}
                {unit}
              </text>
            </g>
          ))}
          <text className={r.axisLabel} x={PAD.left} y={H - 6}>
            Older
          </text>
          <text
            className={r.axisLabel}
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
          >
            Latest
          </text>
          {shown && (
            <line
              className={r.crosshair}
              x1={x(active!)}
              x2={x(active!)}
              y1={PAD.top}
              y2={H - PAD.bottom}
            />
          )}
          <path className={r.line} d={line} />
          {points.map((p, i) => (
            <circle
              key={i}
              className={r.point}
              data-active={i === active || undefined}
              cx={x(i)}
              cy={y(p.value)}
              r={i === active ? 5 : 4}
            />
          ))}
        </svg>
        {shown && (
          <div
            className={r.tooltip}
            style={{
              left: `${(x(active!) / W) * 100}%`,
              top: `${(y(shown.value) / H) * 100}%`,
            }}
            role="status"
          >
            <strong>{shown.display}</strong>
            <span>{shown.label}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
