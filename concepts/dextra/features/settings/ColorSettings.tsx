import { keyLabel } from '../../model/training';
import { usePracticeAppearance } from './PracticeAppearance';
import type { LaneColor } from './PracticeAppearance';
import s from '../../styles.module.css';
export default function ColorSettings({ keys }: { keys: string[] }) {
  const { preferences, update, resetColors } = usePracticeAppearance();
  function change(lane: number, value: Partial<LaneColor>) {
    update({
      colors: preferences.colors.map((color, i) =>
        i === lane ? { ...color, ...value } : color,
      ),
    });
  }
  return (
    <div>
      <p>
        Set each track and key color independently. Track opacity stays below
        100%; notes and pressed keys use translucent colors.
      </p>
      <div className={s.colorSettings}>
        {preferences.colors.map((color, i) => (
          <div key={i} className={s.colorRow}>
            <strong>
              Lane {i + 1} · {keyLabel(keys[i])}
            </strong>
            <label>
              Track
              <input
                type="color"
                aria-label={`Lane ${i + 1} track color`}
                value={color.track}
                onInput={(e) =>
                  change(i, {
                    track: e.currentTarget.value,
                    opacity: color.opacity || 18,
                  })
                }
              />
            </label>
            <label>
              Key
              <input
                type="color"
                aria-label={`Lane ${i + 1} key color`}
                value={color.key}
                onInput={(e) => change(i, { key: e.currentTarget.value })}
              />
            </label>
            <label className={s.opacitySetting}>
              Track opacity <strong>{color.opacity}%</strong>
              <input
                type="range"
                aria-label={`Lane ${i + 1} track opacity`}
                min="0"
                max="80"
                step="1"
                value={color.opacity}
                onChange={(e) => change(i, { opacity: Number(e.target.value) })}
              />
            </label>
          </div>
        ))}
      </div>
      <button className={s.historyLink} onClick={resetColors}>
        Restore default colors
      </button>
    </div>
  );
}
