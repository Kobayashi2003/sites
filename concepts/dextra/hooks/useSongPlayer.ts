import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LEAD_IN } from '../engine/rhythm';

export type PlayOutcome = 'started' | 'cancelled' | 'failed';

/** Small scheduling margin so a start never lands in the past. */
const START_MARGIN = 0.04;

/**
 * Plays a decoded song in step with the rhythm engine. Engine time is
 * `LEAD_IN + song position`; `now()` reports what the listener hears,
 * corrected for output latency and the user's offset.
 */
export function useSongPlayer(
  buffer: AudioBuffer | null,
  volume: number,
  offsetMs: number,
) {
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  const anchor = useRef<{
    at: number;
    elapsed: number;
    heard: number;
  } | null>(null);
  const generation = useRef(0);
  // Live settings are read through a ref so changing them never restarts
  // playback; only the buffer identity does.
  const settings = useRef({ offsetMs, volume });
  useEffect(() => {
    settings.current = { offsetMs, volume };
    if (gain.current) gain.current.gain.value = volume;
  }, [offsetMs, volume]);

  const stop = useCallback(() => {
    generation.current++;
    try {
      source.current?.stop();
    } catch {
      /* Already stopped. */
    }
    source.current?.disconnect();
    source.current = null;
    anchor.current = null;
  }, []);

  /** Starts (or resumes) so that engine time `elapsed` is heard next. */
  const play = useCallback(
    async (elapsed: number): Promise<PlayOutcome> => {
      if (!buffer) return 'failed';
      stop();
      const run = generation.current;
      try {
        const ctx = (context.current ??= new AudioContext({
          latencyHint: 'interactive',
        }));
        if (ctx.state !== 'running') await ctx.resume();
        // Paused or restarted while the context was waking up.
        if (run !== generation.current) return 'cancelled';
        if (!gain.current) {
          gain.current = ctx.createGain();
          gain.current.connect(ctx.destination);
        }
        gain.current.gain.value = settings.current.volume;
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(gain.current);
        const when = ctx.currentTime + START_MARGIN;
        // Engine time trails the heard audio by the user's offset.
        const heard = elapsed + settings.current.offsetMs;
        const position = (heard - LEAD_IN) / 1000;
        anchor.current = { at: when, elapsed, heard };
        // Past the end the clock keeps running for the closing notes.
        if (position >= buffer.duration) return 'started';
        if (position >= 0) node.start(when, position);
        else node.start(when - position);
        source.current = node;
        return 'started';
      } catch {
        return run === generation.current ? 'failed' : 'cancelled';
      }
    },
    [buffer, stop],
  );

  /** Engine time the listener is hearing, or null before playback. */
  const now = useCallback(() => {
    const ctx = context.current;
    const start = anchor.current;
    if (!ctx || !start) return null;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    const heard = start.heard + (ctx.currentTime - start.at - latency) * 1000;
    // Never rewind across the scheduling margin after a resume.
    return Math.max(start.elapsed, heard - settings.current.offsetMs);
  }, []);

  useEffect(
    () => () => {
      stop();
      const ctx = context.current;
      context.current = null;
      gain.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    },
    [stop],
  );

  return useMemo(() => ({ play, pause: stop, now }), [play, stop, now]);
}
