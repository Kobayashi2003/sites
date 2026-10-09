import { useCallback, useEffect, useState } from 'react';
import { alignPhase } from '../engine/audio';
import type { Onset } from '../engine/audio';
import { deleteSong, getSong, listSongs, putSong } from '../lib/songStore';
import type { SongSummary } from '../lib/songStore';
import { analyzeSong, decodeSong, MAX_SONG_BYTES } from '../lib/songAudio';

export type LoadedSong = {
  id: string;
  name: string;
  duration: number;
  bpm: number;
  offset: number;
  onsets: Onset[];
  buffer: AudioBuffer;
};
export type ImportJob = {
  name: string;
  stage: 'decoding' | 'analyzing' | 'saving' | 'error';
  message?: string;
};

const songName = (file: File) =>
  file.name.replace(/\.[a-z0-9]{2,5}$/i, '').trim() || 'Untitled song';

export function useSongLibrary() {
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [available, setAvailable] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setSongs(await listSongs());
    } catch {
      setAvailable(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const importFile = useCallback(
    async (file: File) => {
      const name = songName(file);
      const fail = (message: string) => {
        setJob({ name, stage: 'error', message });
        return null;
      };
      if (file.size > MAX_SONG_BYTES)
        return fail('Files over 40 MB are not supported.');
      if (file.type && !file.type.startsWith('audio/'))
        return fail('Choose an audio file such as MP3, OGG, WAV or M4A.');
      try {
        setJob({ name, stage: 'decoding' });
        const buffer = await decodeSong(file);
        if (buffer.duration < 10 || buffer.duration > 15 * 60)
          return fail('Songs must be between 10 seconds and 15 minutes.');
        setJob({ name, stage: 'analyzing' });
        const analysis = await analyzeSong(buffer);
        if (analysis.onsets.length < 8)
          return fail('No clear beats were found in this file.');
        setJob({ name, stage: 'saving' });
        const id = crypto.randomUUID();
        await putSong({
          id,
          name,
          size: file.size,
          createdAt: new Date().toISOString(),
          duration: analysis.duration,
          bpm: analysis.bpm,
          detectedBpm: analysis.bpm,
          offset: analysis.offset,
          onsets: analysis.onsets,
          envelope: analysis.envelope,
          frameRate: analysis.frameRate,
          audio: file,
        });
        await refresh();
        setJob(null);
        return id;
      } catch {
        return fail(
          'This file could not be decoded or saved. Try MP3, OGG or WAV.',
        );
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSong(id);
      await refresh();
    },
    [refresh],
  );

  /** Changes the tempo and re-aligns the beat grid to the stored onsets. */
  const retune = useCallback(
    async (id: string, bpm: number) => {
      const song = await getSong(id);
      if (!song) return null;
      const next = Math.min(240, Math.max(40, Math.round(bpm * 100) / 100));
      const offset = alignPhase(song.envelope, song.frameRate, next);
      await putSong({ ...song, bpm: next, offset });
      await refresh();
      return { bpm: next, offset };
    },
    [refresh],
  );

  const load = useCallback(async (id: string): Promise<LoadedSong | null> => {
    const song = await getSong(id);
    if (!song) return null;
    const buffer = await decodeSong(song.audio);
    return {
      id,
      name: song.name,
      duration: song.duration,
      bpm: song.bpm,
      offset: song.offset,
      onsets: song.onsets,
      buffer,
    };
  }, []);

  return {
    songs,
    job,
    available,
    importFile,
    remove,
    retune,
    load,
    dismissJob: () => setJob(null),
  };
}
