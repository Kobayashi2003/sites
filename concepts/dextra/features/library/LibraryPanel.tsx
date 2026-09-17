import { useState } from 'react';
import { programs } from '../../engine/rhythm';
import type { ProgramId } from '../../engine/rhythm';
import { DIFFICULTIES } from '../../engine/audio';
import type { Difficulty } from '../../engine/audio';
import type { ImportJob } from '../../hooks/useSongLibrary';
import type { SongSummary } from '../../lib/songStore';
import s from '../../styles.module.css';

type Props = {
  busy: boolean;
  challenge: 'standard' | 'endless';
  program: ProgramId;
  loadProgram: (id: ProgramId) => void;
  songs: SongSummary[];
  songsAvailable: boolean;
  job: ImportJob | null;
  loadedSongId: string | null;
  loadingSongId: string | null;
  difficulty: Difficulty;
  onDifficulty: (value: Difficulty) => void;
  onImport: (file: File) => void;
  onDismissJob: () => void;
  onLoadSong: (id: string) => void;
  onRemoveSong: (id: string) => void;
  onRetuneSong: (id: string, bpm: number) => void;
};

const STAGE_TEXT: Record<ImportJob['stage'], string> = {
  decoding: 'Decoding audio…',
  analyzing: 'Finding beats and onsets…',
  saving: 'Saving to this browser…',
  error: 'Import failed',
};

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function LibraryPanel({
  busy,
  challenge,
  program,
  loadProgram,
  songs,
  songsAvailable,
  job,
  loadedSongId,
  loadingSongId,
  difficulty,
  onDifficulty,
  onImport,
  onDismissJob,
  onLoadSong,
  onRemoveSong,
  onRetuneSong,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const importing = !!job && job.stage !== 'error';
  const planLoaded = (id: ProgramId) =>
    !loadedSongId && id === (challenge === 'endless' ? 'random' : program);
  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !importing) onImport(file);
  };
  return (
    <>
      <p className={s.drawerIntro}>
        Choose what to train. Plans and imported songs load into the same
        six-lane Practice chart.
      </p>
      {busy && (
        <p className={s.drawerWarning}>
          Paused. Loading something new ends the current run.
        </p>
      )}
      <section className={s.songLibrary} aria-labelledby="library-songs">
        <div className={s.librarySectionHead}>
          <h3 id="library-songs">My songs</h3>
          <span>Stored only in this browser</span>
        </div>
        {songsAvailable ? (
          <div
            className={s.songDropTarget}
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
            <label
              className={s.songDrop}
              data-dragging={dragging || undefined}
              data-disabled={importing || undefined}
            >
              <input
                className={s.srOnly}
                type="file"
                accept="audio/*"
                disabled={importing}
                onChange={(e) => {
                  take(e.currentTarget.files);
                  e.currentTarget.value = '';
                }}
              />
              <strong>{importing ? job.name : 'Import a song'}</strong>
              <span>
                {importing
                  ? STAGE_TEXT[job.stage]
                  : 'Drop an audio file here or choose one. MP3, OGG, WAV or M4A, up to 40 MB. A chart is generated from its beats.'}
              </span>
              {importing && (
                <i className={s.songDropProgress} aria-hidden="true" />
              )}
            </label>
          </div>
        ) : (
          <p className={s.drawerWarning}>
            Song import needs browser storage, which is unavailable here.
          </p>
        )}
        <output
          className={s.songJob}
          data-error={job?.stage === 'error' || undefined}
        >
          {job?.stage === 'error' && (
            <>
              <span>
                <strong>{job.name}</strong> · {job.message}
              </span>
              <button type="button" onClick={onDismissJob}>
                Dismiss
              </button>
            </>
          )}
        </output>
        {songs.length > 0 && (
          <>
            <div className={s.songDifficulty}>
              <span className={s.fieldLabel}>Chart difficulty</span>
              <div className={s.formatBar}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={difficulty === d.id}
                    disabled={busy}
                    onClick={() => onDifficulty(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <ul className={s.songList}>
              {songs.map((song) => {
                const loaded = song.id === loadedSongId;
                const tuned = Math.abs(song.bpm - song.detectedBpm) > 0.01;
                return (
                  <li key={song.id} data-loaded={loaded || undefined}>
                    <div className={s.songTitle}>
                      <strong>{song.name}</strong>
                      {loaded && <b>Loaded</b>}
                    </div>
                    <small>
                      {clock(song.duration)} · {Math.round(song.bpm * 10) / 10}{' '}
                      BPM
                      {tuned &&
                        ` (detected ${Math.round(song.detectedBpm * 10) / 10})`}
                    </small>
                    <fieldset className={s.songTempo}>
                      <legend className={s.srOnly}>
                        Tempo for {song.name}
                      </legend>
                      {(
                        [
                          ['½×', song.bpm / 2, 'Halve tempo'],
                          ['2×', song.bpm * 2, 'Double tempo'],
                          ['−0.5', song.bpm - 0.5, 'Lower tempo by 0.5 BPM'],
                          ['+0.5', song.bpm + 0.5, 'Raise tempo by 0.5 BPM'],
                        ] as const
                      ).map(([label, value, name]) => (
                        <button
                          key={label}
                          type="button"
                          aria-label={name}
                          disabled={busy && loaded}
                          onClick={() => onRetuneSong(song.id, value)}
                        >
                          {label}
                        </button>
                      ))}
                      {tuned && (
                        <button
                          type="button"
                          disabled={busy && loaded}
                          onClick={() =>
                            onRetuneSong(song.id, song.detectedBpm)
                          }
                        >
                          Reset
                        </button>
                      )}
                    </fieldset>
                    <div className={s.songActions}>
                      {confirmId === song.id ? (
                        <>
                          <button
                            type="button"
                            className={s.songDelete}
                            disabled={busy && loaded}
                            onClick={() => {
                              setConfirmId(null);
                              onRemoveSong(song.id);
                            }}
                          >
                            Delete song
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                          >
                            Keep
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={loadingSongId !== null}
                            onClick={() => onLoadSong(song.id)}
                          >
                            {loadingSongId === song.id
                              ? 'Loading…'
                              : busy
                                ? 'End & load'
                                : loaded
                                  ? 'Reload'
                                  : 'Load'}{' '}
                            <span aria-hidden="true">↗</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${song.name}`}
                            onClick={() => setConfirmId(song.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
      <div className={s.librarySectionHead}>
        <h3>Training plans</h3>
        <span>32 groups · Both formats</span>
      </div>
      <div className={s.planList}>
        {programs.map((p) => (
          <article key={p.id} data-loaded={planLoaded(p.id)}>
            <div className={s.planListTitle}>
              <span>{p.tag}</span>
              {planLoaded(p.id) && <b>Loaded</b>}
            </div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <div>
              <small>32 groups · Both formats</small>
              <button onClick={() => loadProgram(p.id)}>
                {busy ? 'End & load' : planLoaded(p.id) ? 'Reload' : 'Load'}{' '}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
