import SoundSettings from './SoundSettings';
import ColorSettings from './ColorSettings';
import type { Dispatch, SetStateAction } from 'react';
import Select from '../../components/ui/Select';
import {
  defaults,
  defaultFingers,
  fingers,
  keyLabel,
} from '../../model/training';
import type { Status } from '../../model/training';
import s from './SettingsPanel.module.css';
type Setter<T> = Dispatch<SetStateAction<T>>;
type Props = {
  theme: 'system' | 'light' | 'dark';
  setTheme: Setter<'system' | 'light' | 'dark'>;
  windows: { perfect: number; good: number };
  setWindows: Setter<{ perfect: number; good: number }>;
  busy: boolean;
  keys: string[];
  setKeys: Setter<string[]>;
  mapping: number[];
  setMapping: Setter<number[]>;
  capture: number | null;
  setCapture: Setter<number | null>;
  notice: string;
  setNotice: Setter<string>;
  setStatus: Setter<Status>;
};
export default function SettingsPanel({
  theme,
  setTheme,
  windows,
  setWindows,
  busy,
  keys,
  setKeys,
  mapping,
  setMapping,
  capture,
  setCapture,
  notice,
  setNotice,
  setStatus,
}: Props) {
  return (
    <>
      <p className={s.drawerIntro}>
        Personalize sound, appearance, timing, and your left-hand layout.
      </p>
      <SoundSettings />
      <section
        className={s.windowSettings}
        aria-labelledby="settings-appearance"
      >
        <h3 id="settings-appearance">Appearance</h3>
        <div className={s.drawerSetting}>
          <span>Theme</span>
          <Select
            label="Color theme"
            value={theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(v) => setTheme(v as typeof theme)}
          />
        </div>
        <details className={s.settingsDisclosure}>
          <summary>
            Lane & key colors <span>6 lanes</span>
          </summary>
          <ColorSettings keys={keys} />
        </details>
      </section>
      <section className={s.windowSettings} aria-labelledby="settings-timing">
        <h3 id="settings-timing">Timing & judgement</h3>
        <p>
          Arcaea tap timing: Pure+ ±25 ms, Pure ±50 ms, Far ±100 ms. Falling
          only; Static has no timing deadline. Custom windows apply to the next
          run.
        </p>
        <button
          className={s.settingsReset}
          disabled={busy}
          onClick={() => setWindows({ perfect: 50, good: 100 })}
        >
          Restore defaults
        </button>
        <label>
          Pure <strong>±{windows.perfect} ms</strong>
          <input
            aria-label="Perfect window"
            type="range"
            min="10"
            max={windows.good}
            step="5"
            value={windows.perfect}
            disabled={busy}
            onChange={(e) =>
              setWindows((v) => ({
                ...v,
                perfect: Number(e.target.value),
              }))
            }
          />
        </label>
        <label>
          Far <strong>±{windows.good} ms</strong>
          <input
            aria-label="Good window"
            type="range"
            min={windows.perfect}
            max="250"
            step="5"
            value={windows.good}
            disabled={busy}
            onChange={(e) =>
              setWindows((v) => ({ ...v, good: Number(e.target.value) }))
            }
          />
        </label>
        {busy && <small>End the run below to edit timing or keys.</small>}
      </section>
      <section
        id="dextra-mapping"
        className={s.keySetup}
        aria-labelledby="settings-layout"
      >
        <h3 id="settings-layout">Keys & fingers</h3>
        <p>Shift and A share your pinky by default.</p>
        {busy && (
          <div className={s.layoutLock}>
            <div>
              <strong>Layout locked for this run</strong>
              <p>
                End the unfinished run to edit your keys. It will not be saved.
              </p>
            </div>
            <button
              onClick={() => {
                setStatus('idle');
                setCapture(null);
                setNotice('Select a key, then press its replacement.');
              }}
            >
              End & edit
            </button>
          </div>
        )}
        <output aria-live="polite">
          {busy
            ? 'Your current assignments are shown below.'
            : capture !== null
              ? `Press a key for lane ${capture + 1}. Escape cancels. ${notice}`
              : notice}
        </output>
        <div className={s.keySetupRows}>
          {keys.map((key, i) => (
            <div key={i}>
              <span>Lane {i + 1}</span>
              <button
                disabled={busy}
                aria-label={`Remap lane ${i + 1}, ${keyLabel(key)}`}
                onClick={() => {
                  setCapture(i);
                  setNotice('');
                }}
              >
                {capture === i ? 'Press key…' : keyLabel(key)}
              </button>
              <Select
                disabled={busy}
                label={`Finger for lane ${i + 1}`}
                value={String(mapping[i])}
                options={fingers.map((label, n) => ({
                  label,
                  value: String(n),
                }))}
                onChange={(v) =>
                  setMapping((values) =>
                    values.map((n, j) => (j === i ? Number(v) : n)),
                  )
                }
              />
            </div>
          ))}
        </div>
        <button
          className={s.historyLink}
          disabled={busy}
          onClick={() => {
            setKeys(defaults);
            setMapping(defaultFingers);
            setCapture(null);
            setNotice('Default layout restored.');
          }}
        >
          Restore default layout
        </button>
      </section>
    </>
  );
}
