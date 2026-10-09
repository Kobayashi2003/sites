import { programs } from '../engine/rhythm';
import { DIFFICULTIES } from '../engine/audio';
import type { Difficulty } from '../engine/audio';
import { lifeOptions, timeOptions } from '../model/training';
import type { Result, Status } from '../model/training';
import { BPM_RANGE, OFFSET_LIMIT, SPEED_RANGE } from '../model/settings';
import type { Challenge, Direction, Format, Settings } from '../model/settings';
import { bestRecord, formatRecord, recordKey } from '../model/records';
import { Segmented, Slider, Switch } from '../ui/controls';
import Icon from '../ui/Icon';
import ui from '../styles.module.css';
import { activeProgram, programName } from './session';
import type { SongSession } from './session';
import p from './practice.module.css';

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  status: Status;
  song: SongSession | null;
  songNotice: string;
  history: Result[];
  reduced: boolean;
  onPlay: () => void;
  onEnd: () => void;
  onLibrary: () => void;
  onUnloadSong: () => void;
  onSetup: () => void;
};

/** The configuration a run would be saved with, for looking up its best. */
function currentKey(s: Settings, song: SongSession | null) {
  return recordKey({
    date: '',
    mode: song ? song.name : programName(activeProgram(s)),
    format: song ? 'falling' : s.format,
    challenge: song ? 'standard' : s.challenge,
    limit: s.format === 'static' ? s.timeLimit : s.lives,
    songId: song?.id,
    difficulty: song?.difficulty,
    bpm: s.bpm,
    accuracy: 0,
    hits: 0,
    total: 0,
  });
}

export default function Console({
  settings: s,
  update,
  status,
  song,
  songNotice,
  history,
  reduced,
  onPlay,
  onEnd,
  onLibrary,
  onUnloadSong,
  onSetup,
}: Props) {
  const running = status === 'running';
  const locked = running || status === 'paused';
  const format: Format = song ? 'falling' : s.format;
  const plan = programs.find((p) => p.id === activeProgram(s))!;
  const best = bestRecord(history, currentKey(s, song));

  return (
    <aside
      className={p.console}
      data-running={running || undefined}
      aria-label="Session"
    >
      <div className={p.consoleScroll}>
        <section className={p.loaded}>
          <p className={p.loadedKind}>
            {song ? (
              <>
                <Icon name="music" size={14} /> Your song
              </>
            ) : s.challenge === 'endless' ? (
              'Random groups'
            ) : (
              `Training plan for ${plan.tag}`
            )}
          </p>
          <h2>{song ? song.name : plan.name}</h2>
          <p className={p.loadedText}>
            {song
              ? `Generated from the song's strongest onsets on a ${Math.round(song.bpm)} BPM grid. Low hits go to the outer keys.`
              : plan.description}
          </p>
          {songNotice && <p className={p.notice}>{songNotice}</p>}
          <div className={p.loadedActions}>
            <button
              type="button"
              className={ui.button}
              onClick={onLibrary}
              disabled={running}
            >
              {song ? 'Another song or plan' : 'Choose a plan or song'}
            </button>
            {song && (
              <button
                type="button"
                className={ui.quiet}
                onClick={onUnloadSong}
                disabled={locked}
              >
                <Icon name="back" size={14} /> Back to {plan.name}
              </button>
            )}
          </div>
        </section>

        <fieldset className={p.settingsGroup} disabled={locked}>
          <legend className={ui.srOnly}>Run</legend>
          <Segmented<Format>
            label="Format"
            value={format}
            options={[
              { value: 'falling', label: 'Falling' },
              {
                value: 'static',
                label: 'Static',
                disabled: !!song,
                title: song ? 'Songs play as falling charts' : undefined,
              },
            ]}
            onChange={(format) => update({ format })}
          />
          {song ? (
            <Segmented<Difficulty>
              label="Difficulty"
              value={s.difficulty}
              options={DIFFICULTIES.map((d) => ({
                value: d.id,
                label: d.label,
              }))}
              onChange={(difficulty) => update({ difficulty })}
            />
          ) : (
            <>
              <Segmented<Challenge>
                label="Challenge"
                value={s.challenge}
                options={[
                  { value: 'standard', label: 'Standard' },
                  {
                    value: 'endless',
                    label: format === 'static' ? 'Timed' : 'Survival',
                  },
                ]}
                onChange={(challenge) => update({ challenge })}
              />
              {s.challenge === 'endless' &&
                (format === 'static' ? (
                  <Segmented
                    label="Time limit"
                    value={String(s.timeLimit)}
                    options={timeOptions.map((n) => ({
                      value: String(n),
                      label: `${n} s`,
                    }))}
                    onChange={(v) => update({ timeLimit: Number(v) })}
                  />
                ) : (
                  <Segmented
                    label="Lives"
                    value={String(s.lives)}
                    options={lifeOptions.map((n) => ({
                      value: String(n),
                      label: String(n),
                    }))}
                    onChange={(v) => update({ lives: Number(v) })}
                  />
                ))}
            </>
          )}
          {format === 'falling' && !song && (
            <Slider
              label="Tempo"
              display={`${s.bpm} BPM`}
              value={s.bpm}
              min={BPM_RANGE.min}
              max={BPM_RANGE.max}
              step={BPM_RANGE.step}
              onChange={(bpm) => update({ bpm })}
            />
          )}
        </fieldset>

        {song && (
          <fieldset className={p.settingsGroup}>
            <legend className={ui.srOnly}>Song audio</legend>
            <Slider
              label="Volume"
              display={`${Math.round(s.songVolume * 100)}%`}
              value={s.songVolume}
              min={0}
              max={1}
              step={0.05}
              onChange={(songVolume) => update({ songVolume })}
            />
            <Slider
              label="Audio offset"
              display={`${s.audioOffset > 0 ? '+' : ''}${s.audioOffset} ms`}
              value={s.audioOffset}
              min={-OFFSET_LIMIT}
              max={OFFSET_LIMIT}
              step={5}
              disabled={locked}
              onChange={(audioOffset) => update({ audioOffset })}
              hint={
                <>
                  Raise it if notes feel early against the music, or{' '}
                  <button type="button" className={ui.link} onClick={onSetup}>
                    measure it with a tap test
                  </button>
                  .
                </>
              }
            />
          </fieldset>
        )}

        <fieldset className={p.settingsGroup} disabled={running}>
          <legend className={ui.srOnly}>Display</legend>
          {format === 'falling' && (
            <Slider
              label="Scroll speed"
              display={reduced ? 'Fixed' : `${s.speed.toFixed(2)}×`}
              value={s.speed}
              min={SPEED_RANGE.min}
              max={SPEED_RANGE.max}
              step={SPEED_RANGE.step}
              disabled={reduced}
              onChange={(speed) => update({ speed })}
              hint={
                reduced
                  ? 'Reduced motion shows the next notes in fixed places.'
                  : `${(2.4 / s.speed).toFixed(1)} s of notes visible ahead. Speed never changes timing.`
              }
            />
          )}
          <Segmented<Direction>
            label={format === 'falling' ? 'Notes travel' : 'Rows advance'}
            value={s.direction}
            options={[
              {
                value: 'down',
                label: format === 'falling' ? 'Down' : 'Upward',
              },
              { value: 'up', label: format === 'falling' ? 'Up' : 'Downward' },
            ]}
            onChange={(direction) => update({ direction })}
          />
          {format === 'falling' && !reduced && (
            <Switch
              label="Show hit window"
              checked={s.showWindow}
              onChange={(showWindow) => update({ showWindow })}
            />
          )}
        </fieldset>

        <p className={p.best}>
          {best ? (
            <>
              Best with this setup <strong>{formatRecord(best)}</strong>
              {best.rank && <span className={p.bestRank}>{best.rank}</span>}
            </>
          ) : (
            'No runs yet with this setup.'
          )}
        </p>
      </div>

      <div className={p.transport}>
        <button type="button" className={ui.primary} onClick={onPlay}>
          <Icon name={running ? 'pause' : 'play'} />
          {running
            ? 'Pause'
            : status === 'paused'
              ? 'Resume'
              : status === 'done'
                ? 'Play again'
                : 'Start'}
          <kbd className={ui.kbdHint}>{running ? 'Esc' : 'Enter'}</kbd>
        </button>
        <button
          type="button"
          className={ui.button}
          data-tone="danger"
          disabled={!locked}
          onClick={onEnd}
        >
          <Icon name="stop" />
          End run
        </button>
      </div>
    </aside>
  );
}
