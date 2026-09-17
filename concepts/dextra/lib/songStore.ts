import type { Onset } from '../engine/audio';

/** Imported songs live only in this browser's IndexedDB. */
export type SongRecord = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  duration: number;
  /** Current grid, possibly adjusted by the player. */
  bpm: number;
  offset: number;
  detectedBpm: number;
  onsets: Onset[];
  envelope: Float32Array;
  frameRate: number;
  audio: Blob;
};
export type SongSummary = Pick<
  SongRecord,
  'id' | 'name' | 'size' | 'createdAt' | 'duration' | 'bpm' | 'detectedBpm'
>;

const DB = 'dextra-songs';
const STORE = 'songs';

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listSongs(): Promise<SongSummary[]> {
  const rows = await run<SongRecord[]>('readonly', (s) => s.getAll());
  return rows
    .map(({ id, name, size, createdAt, duration, bpm, detectedBpm }) => ({
      id,
      name,
      size,
      createdAt,
      duration,
      bpm,
      detectedBpm,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const getSong = (id: string) =>
  run<SongRecord | undefined>('readonly', (s) => s.get(id));
export const putSong = (song: SongRecord) =>
  run('readwrite', (s) => s.put(song));
export const deleteSong = (id: string) => run('readwrite', (s) => s.delete(id));
