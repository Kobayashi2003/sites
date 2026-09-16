import { fingers, keyLabel } from '../../model/training';
import type { Result } from '../../model/training';
import {
  laneStyle,
  usePracticeAppearance,
} from '../../features/settings/PracticeAppearance';
import Icon from '../ui/Icon';
import { focusPanelToggle } from './focusPanelToggle';
import s from '../../styles.module.css';

type Format = 'falling' | 'static';
type Challenge = 'standard' | 'endless';

/** One comparable number per run; `higher` says which direction is better. */
function metric(format: Format, challenge: Challenge) {
  if (format === 'static')
    return challenge === 'endless'
      ? {
          label: 'Groups',
          higher: true,
          value: (r: Result) => r.hits,
          text: (n: number) => `${n}`,
        }
      : {
          label: 'Time',
          higher: false,
          value: (r: Result) => r.durationMs ?? Infinity,
          text: (n: number) => `${(n / 1000).toFixed(2)}s`,
        };
  // Records saved before scoring existed have no score and are skipped.
  return {
    label: 'Score',
    higher: true,
    value: (r: Result) => r.score ?? NaN,
    text: (n: number) => n.toLocaleString('en-US'),
  };
}

function sharedFingers(mapping: number[]) {
  const shared = fingers.filter(
    (_, finger) => mapping.filter((m) => m === finger).length > 1,
  );
  if (!shared.length) return 'Every lane has its own finger.';
  return `${shared.join(' and ')} ${shared.length > 1 ? 'cover' : 'covers'} more than one key.`;
}

export default function PracticeGuide({
  keys,
  mapping,
  description,
  format,
  challenge,
  mode,
  history,
  collapsed,
  onCollapse,
  onSettings,
  onLibrary,
  onHistory,
}: {
  keys: string[];
  mapping: number[];
  description: string;
  format: Format;
  challenge: Challenge;
  mode: string;
  history: Result[];
  collapsed: boolean;
  onCollapse: (open: boolean) => void;
  onSettings: () => void;
  onLibrary: () => void;
  onHistory: () => void;
}) {
  const {
    preferences: { colors },
  } = usePracticeAppearance();
  const measure = metric(format, challenge);
  const runs = history.filter(
    (r) =>
      r.mode === mode &&
      (r.format ?? 'falling') === format &&
      (r.challenge ?? 'standard') === challenge,
  );
  const values = runs.map(measure.value).filter(Number.isFinite);
  const best = values.length
    ? (measure.higher ? Math.max : Math.min)(...values)
    : null;
  const last = runs.length ? measure.value(runs[0]) : null;
  return (
    <aside
      id="dextra-guide"
      className={s.practiceGuide}
      aria-label="Practice guide"
      data-collapsed={collapsed}
    >
      <button
        className={s.railToggle}
        aria-expanded="false"
        aria-controls="dextra-guide"
        onClick={() => {
          onCollapse(true);
          focusPanelToggle('dextra-guide', s.panelToggle);
        }}
      >
        <Icon name="expandRight" />
        <span>Guide</span>
      </button>
      <div className={s.guideTop}>
        <span className={s.panelHeading}>Guide</span>
        <button
          className={s.panelToggle}
          aria-label="Collapse guide panel"
          aria-expanded="true"
          aria-controls="dextra-guide"
          title="Collapse panel"
          onClick={() => {
            onCollapse(false);
            focusPanelToggle('dextra-guide', s.railToggle);
          }}
        >
          <Icon name="collapseRight" />
        </button>
      </div>
      <section className={s.guideCard}>
        <span className={s.eyebrow}>01 / YOUR FOCUS</span>
        <h2>Control before speed.</h2>
        <p>{description}</p>
        <button className={s.guideLink} onClick={onLibrary}>
          Explore exercises <span aria-hidden="true">↗</span>
        </button>
      </section>
      <section className={s.guideCard} aria-labelledby="guide-progress">
        <span className={s.eyebrow}>02 / PROGRESS</span>
        <h2 id="guide-progress">
          {runs.length
            ? `${runs.length} ${runs.length === 1 ? 'run' : 'runs'} logged`
            : 'No runs yet'}
        </h2>
        <dl className={s.statGrid}>
          <div>
            <dt>Best {measure.label.toLowerCase()}</dt>
            <dd>{best === null ? '—' : measure.text(best)}</dd>
          </div>
          <div>
            <dt>Last run</dt>
            <dd>
              {last === null || !Number.isFinite(last)
                ? '—'
                : measure.text(last)}
            </dd>
          </div>
        </dl>
        {runs.length > 0 ? (
          <ol className={s.recentRuns} aria-label="Recent runs">
            {runs.slice(0, 3).map((r, i) => {
              const value = measure.value(r);
              return (
                <li key={`${r.date}-${i}`}>
                  <span>
                    {new Date(r.date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <strong>
                    {Number.isFinite(value) ? measure.text(value) : '—'}
                  </strong>
                </li>
              );
            })}
          </ol>
        ) : (
          <p>
            Finish a {format} {challenge === 'endless' ? 'challenge' : 'chart'}{' '}
            of {mode} to track your best here.
          </p>
        )}
        <button className={s.guideLink} onClick={onHistory}>
          All history <span aria-hidden="true">↗</span>
        </button>
      </section>
      <section className={s.guideCard}>
        <span className={s.eyebrow}>03 / LEFT-HAND LAYOUT</span>
        <ul className={s.fingerMap} aria-label="Key assignments">
          {keys.map((key, i) => (
            <li key={i} style={laneStyle(colors[i])}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <kbd>{keyLabel(key)}</kbd>
              <span>{fingers[mapping[i]]}</span>
            </li>
          ))}
        </ul>
        <p>Six lanes, five fingers. {sharedFingers(mapping)}</p>
        <button className={s.guideLink} onClick={onSettings}>
          Customize your layout <span aria-hidden="true">↗</span>
        </button>
      </section>
      <section className={s.guideCard}>
        <span className={s.eyebrow}>04 / HOW TO PRACTICE</span>
        <h2>
          {format === 'falling' ? 'Meet the beat.' : 'Make each press count.'}
        </h2>
        <p>
          {format === 'falling'
            ? 'Press each key as its note reaches the hit line. Connected notes are played together. Start at 60 BPM and build from clean, consistent runs.'
            : 'Play the highlighted row at your own pace. Press chord keys together, then release before the next group. Aim for clean presses before faster times.'}
        </p>
        <p className={s.guideTip}>
          Keep your wrist relaxed. Esc pauses a run; take a short break between
          runs.
        </p>
      </section>
    </aside>
  );
}
