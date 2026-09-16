import { useEffect, useRef, useState } from 'react';
import { usePracticeAppearance } from '../features/settings/PracticeAppearance';
import type { Status } from '../model/training';

/** Separate from the metronome: one short tone per fresh mapped-key press. */
export function useKeyAudio(status: Status, keys: string[]) {
  const {
    preferences: { keySound },
  } = usePracticeAppearance();
  const audio = useRef<AudioContext | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!keySound || status !== 'running') return;
    let active = true;
    const down = (event: KeyboardEvent) => {
      const lane = keys.indexOf(event.code);
      if (
        lane < 0 ||
        event.repeat ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement
      )
        return;
      void (async () => {
        try {
          const context = (audio.current ??= new AudioContext());
          if (context.state !== 'running') await context.resume();
          if (!active || context.state !== 'running') return;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = [440, 494, 554, 622, 698, 784][lane];
          oscillator.connect(gain);
          gain.connect(context.destination);
          gain.gain.setValueAtTime(0, context.currentTime);
          gain.gain.linearRampToValueAtTime(0.045, context.currentTime + 0.003);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.07,
          );
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start();
          oscillator.stop(context.currentTime + 0.08);
          setNotice('');
        } catch {
          if (active)
            setNotice('Key audio unavailable. Practice remains available.');
        }
      })();
    };
    window.addEventListener('keydown', down);
    return () => {
      active = false;
      window.removeEventListener('keydown', down);
    };
  }, [keySound, status, keys]);
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
