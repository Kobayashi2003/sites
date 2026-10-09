import type { CSSProperties } from 'react';
import { fingers, keyLabel } from '../model/training';
import type { LaneResult } from '../model/training';
import type { LaneColor } from '../model/settings';
import { laneHitRate } from '../model/records';
import { Keycap, laneStyle } from '../ui/Keycap';
import ui from '../styles.module.css';
import p from './practice.module.css';

/** The lane that most needs work, or null when every lane was clean. */
export function weakestLane(lanes: LaneResult[], timed: boolean) {
  let worst: number | null = null;
  let worstScore = 0;
  lanes.forEach((lane, i) => {
    const rate = laneHitRate(lane);
    // Misses weigh most; stray presses break ties and decide static runs.
    const score = (timed && rate !== null ? (1 - rate) * 100 : 0) + lane.extras;
    if (score > worstScore) {
      worst = i;
      worstScore = score;
    }
  });
  return worst;
}

export function LaneBreakdown({
  lanes,
  keys,
  mapping,
  colors,
  timed,
}: {
  lanes: LaneResult[];
  keys: string[];
  mapping: number[];
  colors: LaneColor[];
  /** Falling runs have misses and offsets; static runs only presses. */
  timed: boolean;
}) {
  const weakest = weakestLane(lanes, timed);
  const most = Math.max(1, ...lanes.map((l) => l.hits + l.extras));
  return (
    <figure className={p.breakdown}>
      <figcaption>
        {weakest === null
          ? 'Every key played clean.'
          : `${fingers[mapping[weakest]]} on ${keyLabel(keys[weakest])} needs the most work: ${describe(lanes[weakest], timed)}.`}
      </figcaption>
      <div className={p.breakdownLanes}>
        {lanes.map((lane, i) => {
          const rate = laneHitRate(lane);
          const fill = timed ? (rate ?? 0) : lane.hits / most;
          return (
            <div
              key={keys[i]}
              className={p.breakdownLane}
              data-weak={i === weakest || undefined}
              style={
                { ...laneStyle(colors[i]), '--fill': fill } as CSSProperties
              }
            >
              <span className={p.breakdownValue}>
                {timed
                  ? rate === null
                    ? '–'
                    : `${Math.round(rate * 100)}%`
                  : lane.hits}
              </span>
              <span className={p.breakdownBar} aria-hidden="true">
                <i />
              </span>
              <span className={p.breakdownMeta}>
                {timed && lane.meanOffset !== null
                  ? `${lane.meanOffset > 0 ? '+' : ''}${lane.meanOffset} ms`
                  : ' '}
              </span>
              <span
                className={p.breakdownMeta}
                data-alert={lane.extras > 0 || undefined}
              >
                {lane.extras
                  ? `${lane.extras} ${timed ? 'stray' : 'wrong'}`
                  : ' '}
              </span>
              <Keycap
                code={keys[i]}
                finger={mapping[i]}
                color={colors[i]}
                size="sm"
              />
              <span className={ui.srOnly}>{describe(lane, timed)}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function describe(lane: LaneResult, timed: boolean) {
  if (!timed)
    return `${lane.hits} correct, ${lane.extras} wrong ${lane.extras === 1 ? 'press' : 'presses'}`;
  const parts = [`${lane.hits} of ${lane.hits + lane.misses} hit`];
  if (lane.meanOffset)
    parts.push(
      `${Math.abs(lane.meanOffset)} ms ${lane.meanOffset < 0 ? 'early' : 'late'} on average`,
    );
  if (lane.extras)
    parts.push(
      `${lane.extras} stray ${lane.extras === 1 ? 'press' : 'presses'}`,
    );
  return parts.join(', ');
}
