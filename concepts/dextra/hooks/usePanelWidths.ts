import { useCallback, useEffect, useState } from 'react';

export type PanelSide = 'left' | 'right';
export const PANEL_MIN = 180;
export const PANEL_MAX = 420;
/** Dragging a panel narrower than this folds it into a rail. */
export const PANEL_COLLAPSE_BELOW = 120;
export const PANEL_DEFAULTS = { left: 250, right: 260 };

const clamp = (value: number) =>
  Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(value)));

export function usePanelWidths() {
  const [widths, setWidths] = useState(PANEL_DEFAULTS);
  const [collapsed, setCollapsed] = useState({ left: false, right: false });
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
            (v) => Number.isFinite(v) && v >= PANEL_MIN && v <= PANEL_MAX,
          )
        )
          setWidths({ left: saved.left, right: saved.right });
        if (saved)
          setCollapsed({
            left: saved.leftCollapsed === true,
            right: saved.rightCollapsed === true,
          });
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
        localStorage.setItem(
          'dextra-panels',
          JSON.stringify({
            ...widths,
            leftCollapsed: collapsed.left,
            rightCollapsed: collapsed.right,
          }),
        );
      } catch {
        /* Layout remains usable. */
      }
  }, [widths, collapsed, ready]);
  /** Below the collapse threshold the panel folds and keeps its last width. */
  const resize = useCallback((side: PanelSide, value: number) => {
    const fold = value < PANEL_COLLAPSE_BELOW;
    setCollapsed((v) => (v[side] === fold ? v : { ...v, [side]: fold }));
    if (!fold) setWidths((v) => ({ ...v, [side]: clamp(value) }));
  }, []);
  const toggle = useCallback((side: PanelSide, open?: boolean) => {
    setCollapsed((v) => ({
      ...v,
      [side]: open === undefined ? !v[side] : !open,
    }));
  }, []);
  const reset = useCallback((side: PanelSide) => {
    setWidths((v) => ({ ...v, [side]: PANEL_DEFAULTS[side] }));
    setCollapsed((v) => ({ ...v, [side]: false }));
  }, []);
  return { widths, collapsed, resize, toggle, reset };
}
