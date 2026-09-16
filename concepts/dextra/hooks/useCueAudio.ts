import { useCallback, useEffect, useRef, useState } from 'react';

export function useCueAudio() {
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState('');
  const enabled = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const prepare = useCallback(async () => {
    if (!enabled.current) return;
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setNotice('');
    } catch {
      enabled.current = false;
      setSound(false);
      setNotice('Audio unavailable. Follow the visual cues.');
    }
  }, []);
  const toggle = useCallback(() => {
    enabled.current = !enabled.current;
    setSound(enabled.current);
    if (enabled.current) void prepare();
  }, [prepare]);
  const play = useCallback((frequency = 660) => {
    const context = audio.current;
    if (!enabled.current || context?.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.03, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  }, []);
  useEffect(
    () => () => {
      const context = audio.current;
      audio.current = null;
      if (context && context.state !== 'closed')
        void context.close().catch(() => {});
    },
    [],
  );
  return { sound, notice, prepare, toggle, play };
}
