import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

const noop = () => () => {};

/** Native fullscreen for one element; `onChange` runs on entering and leaving. */
export function useFullscreen<T extends HTMLElement>(onChange: () => void) {
  const target = useRef<T>(null);
  const [active, setActive] = useState(false);
  const changed = useRef(onChange);
  useEffect(() => {
    changed.current = onChange;
  }, [onChange]);
  // False on the server and in browsers or frames that refuse fullscreen.
  const supported = useSyncExternalStore(
    noop,
    () => document.fullscreenEnabled,
    () => false,
  );

  useEffect(() => {
    const sync = () => {
      setActive(
        !!target.current && document.fullscreenElement === target.current,
      );
      changed.current();
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.current?.requestFullscreen();
    } catch {
      /* Fullscreen can be refused; the page still works without it. */
    }
  }, []);

  return { target, active, toggle, supported };
}
