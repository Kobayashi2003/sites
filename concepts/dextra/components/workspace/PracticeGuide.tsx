import { fingers, keyLabel } from '../../model/training';
import s from '../../styles.module.css';

export default function PracticeGuide({
  keys,
  mapping,
  description,
  format,
  onSettings,
  onLibrary,
}: {
  keys: string[];
  mapping: number[];
  description: string;
  format: 'falling' | 'static';
  onSettings: () => void;
  onLibrary: () => void;
}) {
  return (
    <aside className={s.practiceGuide} aria-label="Practice guide">
      <section className={s.guideCard}>
        <span className={s.eyebrow}>01 / YOUR FOCUS</span>
        <h2>Control before speed.</h2>
        <p>{description}</p>
        <button onClick={onLibrary}>
          Explore exercises <span aria-hidden="true">↗</span>
        </button>
      </section>
      <section className={s.guideCard}>
        <span className={s.eyebrow}>02 / LEFT-HAND LAYOUT</span>
        <div className={s.fingerMap}>
          {keys.map((key, i) => (
            <div key={i}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <kbd>{keyLabel(key)}</kbd>
              <span>{fingers[mapping[i]]}</span>
            </div>
          ))}
        </div>
        <p>
          Six lanes, five fingers. Two keys share your pinky in the default
          layout.
        </p>
        <button onClick={onSettings}>
          Customize your layout <span aria-hidden="true">↗</span>
        </button>
      </section>
      <section className={s.guideCard}>
        <span className={s.eyebrow}>03 / HOW TO PRACTICE</span>
        <h2>
          {format === 'falling' ? 'Meet the beat.' : 'Make each press count.'}
        </h2>
        <p>
          {format === 'falling'
            ? 'Press each key as its note reaches the hit line. Connected notes are played together. Start at 60 BPM and build from clean, consistent runs.'
            : 'Play the highlighted row at your own pace. Press chord keys together, then release before the next group. Aim for clean presses before faster times.'}
        </p>
        <div className={s.guideTip}>
          Keep your wrist relaxed. Take a short break between runs.
        </div>
      </section>
    </aside>
  );
}
