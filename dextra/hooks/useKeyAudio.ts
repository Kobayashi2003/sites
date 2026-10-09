import { useEffect, useRef, useState } from 'react';

const TONES = [440, 494, 554, 622, 698, 784];

/** One short tone per fresh press of a lane key while `active`. */
export function useKeyAudio(enabled: boolean, active: boolean, keys: string[]) {
  const audio = useRef<AudioContext | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!enabled || !active) return;
    let live = true;
    const down = (event: KeyboardEvent) => {
      const lane = keys.indexOf(event.code);
      if (lane < 0 || event.repeat) return;
      void (async () => {
        try {
          const context = (audio.current ??= new AudioContext());
          if (context.state !== 'running') await context.resume();
          if (!live || context.state !== 'running') return;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const now = context.currentTime;
          oscillator.frequency.value = TONES[lane];
          oscillator.connect(gain);
          gain.connect(context.destination);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.045, now + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start();
          oscillator.stop(now + 0.08);
          setNotice('');
        } catch {
          if (live) setNotice('Key sounds are unavailable in this browser.');
        }
      })();
    };
    window.addEventListener('keydown', down);
    return () => {
      live = false;
      window.removeEventListener('keydown', down);
    };
  }, [enabled, active, keys]);
  useEffect(
    () => () => {
      const context = audio.current;
      audio.current = null;
      if (context && context.state !== 'closed')
        void context.close().catch(() => {});
    },
    [],
  );
  return notice;
}
