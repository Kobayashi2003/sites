import { useState } from 'react';
import {
  defaultHanon,
  hanonPatterns,
  hanonNoteCount,
  MAX_QUEUE,
  MAX_REPEAT,
} from '../../engine/hanon';
import type { HanonConfig } from '../../engine/hanon';
import { keyLabel } from '../../model/training';
import {
  laneStyle,
  usePracticeAppearance,
} from '../settings/PracticeAppearance';
import Select from '../../components/ui/Select';
import s from './HanonComposer.module.css';

export default function HanonComposer({
  config,
  keys,
  busy,
  onLoad,
}: {
  config: HanonConfig;
  keys: string[];
  busy: boolean;
  onLoad: (config: HanonConfig) => void;
}) {
  const [draft, setDraft] = useState(config);
  const [preview, setPreview] = useState(config.queue[0]);
  const [message, setMessage] = useState('');
  const {
    preferences: { colors },
  } = usePracticeAppearance();
  const pattern = hanonPatterns.find((p) => p[0] === preview)!;
  const count = hanonNoteCount(draft);
  const change = (patch: Partial<HanonConfig>) =>
    setDraft((v) => ({ ...v, ...patch }));
  function move(index: number, offset: number) {
    const queue = [...draft.queue];
    [queue[index], queue[index + offset]] = [
      queue[index + offset],
      queue[index],
    ];
    change({ queue });
    setMessage(
      `Hanon ${queue[index + offset]} moved to position ${index + offset + 1}.`,
    );
  }
  return (
    <section className={s.composer} aria-labelledby="hanon-title">
      <div className={s.heading}>
        <div>
          <span className={s.eyebrow}>HANON / SEQUENCE BUILDER</span>
          <h3 id="hanon-title">A little more fluent.</h3>
        </div>
        <span className={s.badge}>18 studies</span>
      </div>
      <p>
        Build a deliberate routine. Explore a pattern, add it to your sequence,
        then practice at your own pace.
      </p>
      <div className={s.catalog} aria-label="Hanon studies">
        {hanonPatterns.map(([id]) => (
          <button
            key={id}
            aria-label={`Preview Hanon ${id}`}
            aria-pressed={preview === id}
            onClick={() => setPreview(id)}
          >
            {id}
          </button>
        ))}
      </div>
      <div className={s.preview}>
        <div className={s.heading}>
          <strong>Hanon {preview}</strong>
          <span>8 notes / phrase</span>
        </div>
        {(['up', 'down'] as const).map((direction, i) => (
          <div className={s.phrase} key={direction}>
            <span>{i ? '↓ Down' : '↑ Up'}</span>
            <div
              aria-label={`${direction === 'up' ? 'Ascending' : 'Descending'} keys`}
            >
              {pattern[i + 1].split('').map((digit, n) => (
                <span
                  key={n}
                  style={laneStyle(colors[Number(digit) - 1])}
                  title={`Lane ${digit}: ${keyLabel(keys[Number(digit) - 1])}`}
                >
                  {keyLabel(keys[Number(digit) - 1])}
                </span>
              ))}
            </div>
          </div>
        ))}
        <button
          className={s.add}
          disabled={draft.queue.length >= MAX_QUEUE}
          onClick={() => {
            change({ queue: [...draft.queue, preview] });
            setMessage(
              `Hanon ${preview} added. ${draft.queue.length + 1} studies in sequence.`,
            );
          }}
        >
          + Add Hanon {preview} to sequence
        </button>
      </div>
      <div className={s.heading}>
        <h4>Your sequence</h4>
        <span>
          {draft.queue.length} / {MAX_QUEUE}
        </span>
      </div>
      {draft.queue.length === 0 ? (
        <p className={s.empty}>
          Your sequence is empty. Choose a study above and add it to begin.
        </p>
      ) : (
        <ol className={s.queue}>
          {draft.queue.map((id, i) => (
            <li key={`${i}-${id}`}>
              <span className={s.number}>{String(i + 1).padStart(2, '0')}</span>
              <strong>Hanon {id}</strong>
              <div>
                <button
                  aria-label={`Move study ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`Move study ${i + 1} down`}
                  disabled={i === draft.queue.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  aria-label={`Remove study ${i + 1}`}
                  onClick={() => {
                    change({ queue: draft.queue.filter((_, n) => n !== i) });
                    setMessage(`Study ${i + 1} removed.`);
                  }}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className={s.options}>
        <div>
          <span>Repeats per direction</span>
          <Select
            label="Repeats per direction"
            value={String(draft.repeat)}
            onChange={(value) => change({ repeat: Number(value) })}
            options={Array.from({ length: MAX_REPEAT }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1}×`,
            }))}
          />
        </div>
        <div>
          <span>Note value</span>
          <Select
            label="Note value"
            value={String(draft.division)}
            onChange={(value) =>
              change({
                division: Number(value) as HanonConfig['division'],
              })
            }
            options={[
              { value: '4', label: 'Quarter · 1/4' },
              { value: '8', label: 'Eighth · 1/8' },
              { value: '16', label: 'Sixteenth · 1/16' },
            ]}
          />
        </div>
        <div className={s.wide}>
          <span>Pattern direction</span>
          <Select
            label="Pattern direction"
            value={draft.traversal}
            onChange={(value) =>
              change({ traversal: value as HanonConfig['traversal'] })
            }
            options={[
              { value: 'both', label: 'Ascending, then descending' },
              { value: 'up', label: 'Ascending only' },
              { value: 'down', label: 'Descending only' },
            ]}
          />
        </div>
      </div>
      <div className={s.summary}>
        <strong>{count.toLocaleString()} notes</strong>
        <span>Falling + Static · Tempo set in Practice</span>
      </div>
      <div className={s.actions}>
        <button
          onClick={() => {
            setDraft({ ...defaultHanon, queue: [...defaultHanon.queue] });
            setMessage('Starter sequence restored.');
          }}
        >
          Reset sequence
        </button>
        <button
          className={s.primary}
          disabled={!count}
          onClick={() => onLoad(draft)}
        >
          {busy ? 'End & load sequence' : 'Load sequence'}{' '}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <output className={s.feedback} aria-live="polite">
        {message}
      </output>
      <small className={s.source}>
        Six-lane patterns from{' '}
        <a
          href="https://frankhuex.github.io/InFalsusHanon/index.html"
          target="_blank"
          rel="noreferrer"
        >
          In Falsus Hanon ↗
        </a>
        . Studies 01–16, 18–19.
      </small>
    </section>
  );
}
