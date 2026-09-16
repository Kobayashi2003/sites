import { usePracticeAppearance } from './PracticeAppearance';
import s from '../../styles.module.css';

export default function SoundSettings() {
  const { preferences, update } = usePracticeAppearance();
  return (
    <section className={s.windowSettings} aria-labelledby="settings-sound">
      <h3 id="settings-sound">Sound</h3>
      <label className={s.keySoundToggle}>
        <span>Key sounds</span>
        <input
          type="checkbox"
          aria-label="Key sounds"
          aria-describedby="key-sound-description"
          checked={preferences.keySound}
          onChange={(e) => update({ keySound: e.target.checked })}
        />
      </label>
      <p id="key-sound-description">
        Play a short tone when you press a practice key. Applies to both Falling
        and Static.
      </p>
    </section>
  );
}
