import { useMemo, useState } from 'react';
import { createRhythm, programs } from '../engine/rhythm';
import type { ProgramId } from '../engine/rhythm';
import type { ImportJob } from '../hooks/useSongLibrary';
import type { SongSummary } from '../lib/songStore';
import type { Result } from '../model/training';
import type { LaneColor, Settings } from '../model/settings';
import { bestRecord, formatRecord, recordKey } from '../model/records';
import { laneStyle } from '../ui/Keycap';
import Icon from '../ui/Icon';
import ui from '../styles.module.css';
import l from './library.module.css';

const STAGE_TEXT: Record<ImportJob['stage'], string> = {
  decoding: 'Decoding the audio',
  analyzing: 'Finding beats and onsets',
  saving: 'Saving to this browser',
  error: 'Import failed',
};
const PREVIEW_GROUPS = 16;
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** The opening groups of a plan, read bottom to top like the chart. */
function PatternPreview({
  id,
  mapping,
  colors,
}: {
  id: ProgramId;
  mapping: number[];
  colors: LaneColor[];
}) {
  const groups = useMemo(
    () =>
      createRhythm(60, mapping, id)
        .notes.slice(0, PREVIEW_GROUPS)
        .map((n) => n.lanes),
    [id, mapping],
  );
  return (
    <div className={l.pattern} aria-hidden="true">
      {groups.map((lanes, row) => (
        <div key={row}>
          {colors.map((color, lane) => (
            <i
              key={lane}
              style={laneStyle(color)}
              data-on={lanes.includes(lane) || undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type Props = {
  settings: Settings;
  history: Result[];
  busy: boolean;
  songs: SongSummary[];
  songsAvailable: boolean;
  job: ImportJob | null;
  loadedSongId: string | null;
  loadingSongId: string | null;
  onLoadPlan: (id: ProgramId) => void;
  onImport: (file: File) => void;
  onDismissJob: () => void;
  onLoadSong: (id: string) => void;
  onRemoveSong: (id: string) => void;
  onRetuneSong: (id: string, bpm: number) => void;
};

export default function LibraryView({
  settings,
  history,
  busy,
  songs,
  songsAvailable,
  job,
  loadedSongId,
  loadingSongId,
  onLoadPlan,
  onImport,
  onDismissJob,
  onLoadSong,
  onRemoveSong,
  onRetuneSong,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const importing = !!job && job.stage !== 'error';
  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !importing) onImport(file);
  };
  const loadedPlan =
    !loadedSongId && settings.challenge === 'standard'
      ? settings.program
      : null;
  const planBest = (id: ProgramId) =>
    bestRecord(
      history,
      recordKey({
        date: '',
        mode: programs.find((p) => p.id === id)!.name,
        format: settings.format,
        challenge: 'standard',
        bpm: settings.bpm,
        accuracy: 0,
        hits: 0,
        total: 0,
      }),
    );

  return (
    <div className={l.library}>
      {busy && (
        <p className={l.warning}>
          A run is paused. Loading something new ends it without saving.
        </p>
      )}
      <section className={l.plans} aria-labelledby="dextra-plans">
        <header className={l.sectionHead}>
          <h2 id="dextra-plans">Training plans</h2>
          <p>
            Thirty-two groups each, playable as a falling or a static chart.
            Survival and timed runs draw random groups instead.
          </p>
        </header>
        <ul className={l.planGrid}>
          {programs.map((plan) => {
            const best = planBest(plan.id);
            const loaded = loadedPlan === plan.id;
            return (
              <li
                key={plan.id}
                className={l.plan}
                data-loaded={loaded || undefined}
              >
                <PatternPreview
                  id={plan.id}
                  mapping={settings.mapping}
                  colors={settings.colors}
                />
                <div className={l.planBody}>
                  <h3>{plan.name}</h3>
                  <p className={l.planFocus}>Trains {plan.tag}</p>
                  <p>{plan.description}</p>
                  <p className={l.planBest}>
                    {best
                      ? `Your best at ${settings.bpm} BPM, ${settings.format}: ${formatRecord(best)}`
                      : `Not played at ${settings.bpm} BPM as a ${settings.format} chart yet.`}
                  </p>
                  <button
                    type="button"
                    className={loaded ? ui.button : ui.primary}
                    onClick={() => onLoadPlan(plan.id)}
                  >
                    {loaded ? 'Loaded, go to the chart' : 'Practice this plan'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={l.songs} aria-labelledby="dextra-songs">
        <header className={l.sectionHead}>
          <h2 id="dextra-songs">Your songs</h2>
          <p>
            Import a track and DEXTRA writes a chart from its beats. Files stay
            in this browser; nothing is uploaded.
          </p>
        </header>
        {songsAvailable ? (
          <label
            className={l.drop}
            data-dragging={dragging || undefined}
            data-busy={importing || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              take(e.dataTransfer.files);
            }}
          >
            <input
              className={ui.srOnly}
              type="file"
              accept="audio/*"
              disabled={importing}
              onChange={(e) => {
                take(e.currentTarget.files);
                e.currentTarget.value = '';
              }}
            />
            <Icon name="upload" size={22} />
            <strong>
              {importing ? job.name : 'Drop an audio file, or choose one'}
            </strong>
            <span>
              {importing
                ? `${STAGE_TEXT[job.stage]}…`
                : 'MP3, OGG, WAV or M4A, up to 40 MB and 15 minutes.'}
            </span>
            {importing && <i className={l.dropProgress} aria-hidden="true" />}
          </label>
        ) : (
          <p className={l.warning}>
            This browser blocks local storage for the page, so songs cannot be
            imported here.
          </p>
        )}
        <div aria-live="polite">
          {job?.stage === 'error' && (
            <p className={l.error}>
              <span>
                <strong>{job.name}</strong>: {job.message}
              </span>
              <button type="button" className={ui.quiet} onClick={onDismissJob}>
                Dismiss
              </button>
            </p>
          )}
        </div>
        {songs.length === 0 ? (
          songsAvailable && (
            <p className={l.empty}>
              No songs yet. A track with a steady beat makes the cleanest chart.
            </p>
          )
        ) : (
          <ul className={l.songList}>
            {songs.map((song) => {
              const loaded = song.id === loadedSongId;
              const tuned = Math.abs(song.bpm - song.detectedBpm) > 0.01;
              const lockedHere = busy && loaded;
              return (
                <li key={song.id} data-loaded={loaded || undefined}>
                  <div className={l.songMain}>
                    <h3>{song.name}</h3>
                    <p>
                      {clock(song.duration)} long,{' '}
                      {Math.round(song.bpm * 10) / 10} BPM
                      {tuned &&
                        ` (detected ${Math.round(song.detectedBpm * 10) / 10})`}
                    </p>
                  </div>
                  <fieldset className={l.tempo} disabled={lockedHere}>
                    <legend>Beat grid</legend>
                    {(
                      [
                        ['Half', song.bpm / 2, 'Halve the tempo'],
                        ['Double', song.bpm * 2, 'Double the tempo'],
                        ['−0.5', song.bpm - 0.5, 'Lower the tempo by 0.5 BPM'],
                        ['+0.5', song.bpm + 0.5, 'Raise the tempo by 0.5 BPM'],
                      ] as const
                    ).map(([label, value, name]) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={name}
                        title={name}
                        onClick={() => onRetuneSong(song.id, value)}
                      >
                        {label}
                      </button>
                    ))}
                    {tuned && (
                      <button
                        type="button"
                        onClick={() => onRetuneSong(song.id, song.detectedBpm)}
                      >
                        Reset
                      </button>
                    )}
                  </fieldset>
                  <div className={l.songActions}>
                    {confirmId === song.id ? (
                      <>
                        <button
                          type="button"
                          className={ui.button}
                          data-tone="danger"
                          disabled={lockedHere}
                          onClick={() => {
                            setConfirmId(null);
                            onRemoveSong(song.id);
                          }}
                        >
                          Delete for good
                        </button>
                        <button
                          type="button"
                          className={ui.quiet}
                          onClick={() => setConfirmId(null)}
                        >
                          Keep it
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={loaded ? ui.button : ui.primary}
                          disabled={loadingSongId !== null}
                          onClick={() => onLoadSong(song.id)}
                        >
                          {loadingSongId === song.id
                            ? 'Loading…'
                            : loaded
                              ? 'Loaded, go to the chart'
                              : 'Play this song'}
                        </button>
                        <button
                          type="button"
                          className={ui.iconButton}
                          aria-label={`Delete ${song.name}`}
                          title="Delete"
                          onClick={() => setConfirmId(song.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
