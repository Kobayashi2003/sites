import { useEffect, useState } from 'react';
import { PURE_PLUS_WINDOW } from '../engine/rhythm';
import {
  defaultFingers,
  defaults as defaultKeys,
  fingerNumber,
  fingers,
  keyLabel,
  keyOptions,
} from '../model/training';
import { ARCAEA_WINDOWS, colorsFor, fingerColors } from '../model/settings';
import type { Settings, Theme } from '../model/settings';
import { Segmented, Slider, Switch } from '../ui/controls';
import { Keycap } from '../ui/Keycap';
import ui from '../styles.module.css';
import Calibration from './Calibration';
import st from './setup.module.css';

const RANGE = 250;

export default function SetupView({
  settings: s,
  update,
  locked,
  onEndRun,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** A run is paused; keys and timing wait until it ends. */
  locked: boolean;
  onEndRun: () => void;
}) {
  const [capture, setCapture] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (capture === null) return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setCapture(null);
        return;
      }
      e.preventDefault();
      if (e.code === 'Escape') {
        setCapture(null);
        setNotice('Kept the previous key.');
        return;
      }
      if (!keyOptions.includes(e.code)) {
        setNotice('Use a letter, a digit, Shift, Space or an arrow key.');
        return;
      }
      if (s.keys.some((key, i) => key === e.code && i !== capture)) {
        setNotice(`${keyLabel(e.code)} already plays another lane.`);
        return;
      }
      update({ keys: s.keys.map((key, i) => (i === capture ? e.code : key)) });
      setNotice(`Lane ${capture + 1} now plays on ${keyLabel(e.code)}.`);
      setCapture(null);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [capture, s.keys, update]);

  const setFinger = (lane: number, finger: number) =>
    update({
      mapping: s.mapping.map((f, i) => (i === lane ? finger : f)),
      colors: s.colors.map((c, i) =>
        i === lane
          ? { ...c, track: fingerColors[finger], key: fingerColors[finger] }
          : c,
      ),
    });
  const setColor = (lane: number, patch: Partial<Settings['colors'][number]>) =>
    update({
      colors: s.colors.map((c, i) => (i === lane ? { ...c, ...patch } : c)),
    });
  const plus = Math.min(PURE_PLUS_WINDOW, s.windows.perfect);
  const pct = (ms: number) => `${(ms / (2 * RANGE)) * 100}%`;

  return (
    <div className={st.setup}>
      {locked && (
        <div className={st.lockBanner}>
          <p>
            A run is paused. Keys and timing stay fixed until it ends; the run
            is not saved.
          </p>
          <button type="button" className={ui.button} onClick={onEndRun}>
            End the run
          </button>
        </div>
      )}

      <section className={st.section} aria-labelledby="setup-keys">
        <header>
          <h2 id="setup-keys">Keys and fingers</h2>
          <p>
            Six lanes for five fingers. By default Shift and A share the pinky;
            the numbers are piano fingering, thumb 1 to pinky 5.
          </p>
        </header>
        <ol className={st.lanes}>
          {s.keys.map((code, lane) => (
            <li key={lane}>
              <Keycap
                code={code}
                finger={s.mapping[lane]}
                color={s.colors[lane]}
              />
              <div className={st.laneControls}>
                <button
                  type="button"
                  className={ui.button}
                  disabled={locked}
                  aria-pressed={capture === lane}
                  onClick={() => {
                    setCapture(capture === lane ? null : lane);
                    setNotice('');
                  }}
                >
                  {capture === lane
                    ? 'Press a key…'
                    : `Change key for lane ${lane + 1}`}
                </button>
                <label className={st.fingerSelect}>
                  <span className={ui.srOnly}>Finger for lane {lane + 1}</span>
                  <select
                    className={ui.select}
                    value={s.mapping[lane]}
                    disabled={locked}
                    onChange={(e) => setFinger(lane, Number(e.target.value))}
                  >
                    {fingers.map((name, finger) => (
                      <option key={name} value={finger}>
                        {name} ({fingerNumber(finger)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
        <p className={st.notice} aria-live="polite">
          {capture !== null
            ? `Press the new key for lane ${capture + 1}. Escape keeps the old one.`
            : notice}
        </p>
        <button
          type="button"
          className={ui.quiet}
          disabled={locked}
          onClick={() => {
            update({
              keys: defaultKeys,
              mapping: defaultFingers,
              colors: colorsFor(defaultFingers),
            });
            setCapture(null);
            setNotice('Restored Shift, A, S, D, F and Space.');
          }}
        >
          Restore the default layout
        </button>
      </section>

      <section className={st.section} aria-labelledby="setup-timing">
        <header>
          <h2 id="setup-timing">Timing windows</h2>
          <p>
            How far from the beat a falling note still counts. Static charts
            have no deadline. Changes apply from the next run.
          </p>
        </header>
        <div className={st.windowDiagram} aria-hidden="true">
          <span
            className={st.windowFar}
            style={{
              left: pct(RANGE - s.windows.good),
              width: pct(2 * s.windows.good),
            }}
          />
          <span
            className={st.windowPure}
            style={{
              left: pct(RANGE - s.windows.perfect),
              width: pct(2 * s.windows.perfect),
            }}
          />
          <span
            className={st.windowPlus}
            style={{ left: pct(RANGE - plus), width: pct(2 * plus) }}
          />
          <i />
          <small style={{ left: 0 }}>{-RANGE} ms, early</small>
          <small style={{ right: 0 }}>+{RANGE} ms, late</small>
        </div>
        <p className={st.windowLegend}>
          Pure+ within ±{plus} ms, Pure within ±{s.windows.perfect} ms, Far
          within ±{s.windows.good} ms. Anything later is a miss.
        </p>
        <Slider
          label="Pure window"
          display={`±${s.windows.perfect} ms`}
          value={s.windows.perfect}
          min={10}
          max={s.windows.good}
          step={5}
          disabled={locked}
          onChange={(perfect) => update({ windows: { ...s.windows, perfect } })}
        />
        <Slider
          label="Far window"
          display={`±${s.windows.good} ms`}
          value={s.windows.good}
          min={s.windows.perfect}
          max={RANGE}
          step={5}
          disabled={locked}
          onChange={(good) => update({ windows: { ...s.windows, good } })}
        />
        <button
          type="button"
          className={ui.quiet}
          disabled={
            locked ||
            (s.windows.perfect === ARCAEA_WINDOWS.perfect &&
              s.windows.good === ARCAEA_WINDOWS.good)
          }
          onClick={() => update({ windows: ARCAEA_WINDOWS })}
        >
          Use the standard ±50 / ±100 ms windows
        </button>
      </section>

      <section className={st.section} aria-labelledby="setup-sound">
        <header>
          <h2 id="setup-sound">Sound and sync</h2>
          <p>
            The audio offset lines imported songs up with what you hear. The tap
            test measures it for your headphones and keyboard.
          </p>
        </header>
        <Switch
          label="Play a tone on each key press"
          checked={s.keySound}
          onChange={(keySound) => update({ keySound })}
          description="Each lane has its own pitch, in falling and static runs."
        />
        <Slider
          label="Song audio offset"
          display={`${s.audioOffset > 0 ? '+' : ''}${s.audioOffset} ms`}
          value={s.audioOffset}
          min={-200}
          max={200}
          step={5}
          disabled={locked}
          onChange={(audioOffset) => update({ audioOffset })}
        />
        <Calibration
          offset={s.audioOffset}
          onApply={(audioOffset) => update({ audioOffset })}
        />
      </section>

      <section className={st.section} aria-labelledby="setup-look">
        <header>
          <h2 id="setup-look">Appearance</h2>
          <p>
            Lanes take their finger’s color, so the chart shows which finger
            plays next. Override any lane here.
          </p>
        </header>
        <Segmented<Theme>
          label="Theme"
          value={s.theme}
          options={[
            { value: 'system', label: 'Match the system' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(theme) => update({ theme })}
        />
        <ul className={st.colors}>
          {s.colors.map((color, lane) => (
            <li key={lane}>
              <span className={st.colorLane}>
                Lane {lane + 1}, {keyLabel(s.keys[lane])}
              </span>
              <label>
                <span className={ui.srOnly}>Lane {lane + 1} note color</span>
                <input
                  type="color"
                  value={color.key}
                  onChange={(e) =>
                    setColor(lane, {
                      key: e.target.value,
                      track: e.target.value,
                    })
                  }
                />
              </label>
              <Slider
                label="Track tint"
                display={`${color.opacity}%`}
                value={color.opacity}
                min={0}
                max={40}
                step={1}
                onChange={(opacity) => setColor(lane, { opacity })}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={ui.quiet}
          onClick={() => update({ colors: colorsFor(s.mapping) })}
        >
          Color every lane by its finger again
        </button>
      </section>
    </div>
  );
}
