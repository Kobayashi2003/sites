import { useEffect, useState } from 'react';
export function usePanelWidths() {
  const [widths, setWidths] = useState({ left: 250, right: 260 });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(
          localStorage.getItem('dextra-panels') || 'null',
        );
        if (
          saved &&
          [saved.left, saved.right].every(
            (v) => Number.isFinite(v) && v >= 180 && v <= 420,
          )
        )
          setWidths(saved);
      } catch {
        /* Optional local layout. */
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('dextra-panels', JSON.stringify(widths));
      } catch {
        /* Layout remains usable. */
      }
  }, [widths, ready]);
  return {
    widths,
    resize: (side: 'left' | 'right', value: number) =>
      setWidths((v) => ({ ...v, [side]: Math.min(420, Math.max(180, value)) })),
  };
}
