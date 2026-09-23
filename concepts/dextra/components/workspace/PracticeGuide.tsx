import { fingers, keyLabel } from '../../model/training';
import type { Result } from '../../model/training';
import type { RecordConfiguration } from '../../model/records';
import {
  matchingRecords,
  bestRecord,
  practiceRating,
  ratingText,
} from '../../engine/records';
import type { Rating } from '../../engine/records';
import {
  laneStyle,
  usePracticeAppearance,
} from '../../features/settings/PracticeAppearance';
import Icon from '../ui/Icon';
import { focusPanelToggle } from './focusPanelToggle';
import s from './PracticeGuide.module.css';

type Format = 'falling' | 'static';
type Challenge = 'standard' | 'endless';

function RatingValue({ rating }: { rating: Rating | null }) {
  if (!rating) return <>—</>;
  const number = rating.value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
  return (
    <span className={s.ratingValue} aria-label={ratingText(rating)}>
      <span className={s.ratingNumber} aria-hidden="true">
        {number}
      </span>
      <span className={s.ratingUnit} aria-hidden="true">
        {rating.unit}
      </span>
    </span>
  );
}

export default function PracticeGuide({
  keys,
  mapping,
  configuration,
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
  configuration: RecordConfiguration;
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
  const runs = matchingRecords(history, configuration);
  const best = bestRecord(runs);
  const last = runs[0];
  return (
    <aside
      id="dextra-guide"
      className={s.practiceGuide}
      data-dextra-guide
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
            <dt>Personal best</dt>
            <dd>
              <RatingValue rating={best ? practiceRating(best) : null} />
            </dd>
          </div>
          <div>
            <dt>Last run</dt>
            <dd>
              <RatingValue rating={last ? practiceRating(last) : null} />
            </dd>
          </div>
        </dl>
        {runs.length > 0 ? (
          <ol className={s.recentRuns} aria-label="Recent runs">
            {runs.slice(0, 3).map((r, i) => {
              const value = practiceRating(r);
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
                    <RatingValue rating={value} />
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
          Configuration history <span aria-hidden="true">↗</span>
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
        <p>
          Six lanes, five fingers.{' '}
          {(() => {
            const shared = fingers.filter(
              (_, finger) =>
                mapping.filter((mapped) => mapped === finger).length > 1,
            );
            if (!shared.length) return 'Every lane has its own finger.';
            return `${shared.join(' and ')} ${shared.length > 1 ? 'cover' : 'covers'} more than one key.`;
          })()}
        </p>
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
