import { useCallback, useEffect, useState } from 'react';
import { HISTORY_LIMIT } from '../model/training';
import type { Result } from '../model/training';
import { defaultSettings, loadStored, saveStored } from '../model/settings';
import type { Settings } from '../model/settings';

/** Settings and run history, persisted in this browser. */
export function useDextraStore() {
  const [state, setState] = useState<{
    settings: Settings;
    history: Result[];
  }>({ settings: defaultSettings, history: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Read after hydration so the server and first client render agree.
    queueMicrotask(() => {
      if (cancelled) return;
      setState(loadStored());
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded) saveStored(state.settings, state.history);
  }, [loaded, state]);

  const update = useCallback(
    (patch: Partial<Settings>) =>
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    [],
  );
  const addResult = useCallback(
    (result: Result) =>
      setState((s) => ({
        ...s,
        history: [result, ...s.history].slice(0, HISTORY_LIMIT),
      })),
    [],
  );
  const clearHistory = useCallback(
    () => setState((s) => ({ ...s, history: [] })),
    [],
  );

  return {
    settings: state.settings,
    history: state.history,
    loaded,
    update,
    addResult,
    clearHistory,
  };
}
