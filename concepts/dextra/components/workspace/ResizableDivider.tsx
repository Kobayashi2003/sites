/* eslint-disable jsx-a11y/prefer-tag-over-role -- Interactive ARIA window splitter supports pointer resizing and keyboard values. */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import s from '../../styles.module.css';
type Props = {
  side: 'left' | 'right';
  value: number;
  onChange: (width: number) => void;
};
export default function ResizableDivider({ side, value, onChange }: Props) {
  const handle = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ actual: value, max: 420 });
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
        180,
        Math.min(
          420,
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
    onChange(Math.max(180, Math.min(bounds.max, width)));
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const box = event.currentTarget.parentElement!.getBoundingClientRect();
    change(
      side === 'left' ? event.clientX - box.left : box.right - event.clientX,
    );
  }
  return (
    <div
      role="separator"
      ref={handle}
      className={s.resizeHandle}
      aria-label={`Resize ${side} panel`}
      aria-orientation="vertical"
      aria-valuemin={180}
      aria-valuemax={bounds.max}
      aria-valuenow={bounds.actual}
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        change(
          event.key === 'Home'
            ? 180
            : event.key === 'End'
              ? bounds.max
              : bounds.actual +
                (event.key === 'ArrowRight' ? 1 : -1) *
                  (side === 'left' ? 1 : -1) *
                  (event.shiftKey ? 40 : 10),
        );
      }}
      onDoubleClick={() => change(side === 'left' ? 250 : 260)}
    />
  );
}
