/* eslint-disable jsx-a11y/prefer-tag-over-role -- Interactive ARIA window splitter supports pointer resizing and keyboard values. */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { PANEL_MAX, PANEL_MIN } from '../../hooks/usePanelWidths';
import s from '../../styles.module.css';
type Props = {
  side: 'left' | 'right';
  value: number;
  collapsed: boolean;
  controls: string;
  onChange: (width: number) => void;
  onToggle: () => void;
  onReset: () => void;
};
/**
 * Window splitter. Dragging past the collapse threshold folds the panel;
 * Enter toggles it, double-click restores the default width.
 */
export default function ResizableDivider({
  side,
  value,
  collapsed,
  controls,
  onChange,
  onToggle,
  onReset,
}: Props) {
  const handle = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ actual: value, max: PANEL_MAX });
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const element = handle.current;
    if (!element?.parentElement) return;
    const parent = element.parentElement;
    const panel =
      side === 'left'
        ? element.previousElementSibling
        : element.nextElementSibling;
    const observer = new ResizeObserver(() => {
      const max = Math.max(
        PANEL_MIN,
        Math.min(
          PANEL_MAX,
          Math.floor(
            parent.clientWidth * (window.innerWidth <= 950 ? 0.32 : 0.27),
          ),
        ),
      );
      const actual = Math.round(panel?.getBoundingClientRect().width ?? value);
      setBounds((old) =>
        old.actual === actual && old.max === max ? old : { actual, max },
      );
    });
    observer.observe(parent);
    if (panel) observer.observe(panel);
    return () => observer.disconnect();
  }, [side, value]);
  function change(width: number) {
    // Widths below the minimum are passed through so the panel can fold.
    onChange(width < PANEL_MIN ? width : Math.min(bounds.max, width));
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const box = event.currentTarget.parentElement!.getBoundingClientRect();
    change(
      side === 'left' ? event.clientX - box.left : box.right - event.clientX,
    );
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }
  return (
    <div
      role="separator"
      ref={handle}
      className={s.resizeHandle}
      data-dragging={dragging || undefined}
      aria-label={`Resize ${side === 'left' ? 'controls' : 'guide'} panel`}
      aria-controls={controls}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={bounds.max}
      aria-valuenow={collapsed ? 0 : bounds.actual}
      aria-valuetext={collapsed ? 'Collapsed' : `${bounds.actual} pixels`}
      title="Drag to resize · drag narrow to collapse · Enter toggles"
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onToggle();
          return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        const grow =
          (event.key === 'ArrowRight') === (side === 'left') ||
          event.key === 'End';
        if (collapsed) {
          if (grow) change(event.key === 'End' ? bounds.max : PANEL_MIN);
          return;
        }
        change(
          event.key === 'Home'
            ? PANEL_MIN
            : event.key === 'End'
              ? bounds.max
              : Math.max(
                  PANEL_MIN,
                  bounds.actual + (grow ? 1 : -1) * (event.shiftKey ? 40 : 10),
                ),
        );
      }}
      onDoubleClick={onReset}
    />
  );
}
