import { useEffect, useRef, useState } from 'react';
import { lockScroll } from '../lib/lockScroll';
import type { Status } from '../model/training';
export default function useFullscreen(
  status: Status,
  onStatus: (s: Status) => void,
) {
  const panel = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  async function exit() {
    if (document.fullscreenElement === panel.current)
      await document.exitFullscreen();
    setExpanded(false);
    if (status === 'running') onStatus('paused');
    requestAnimationFrame(() => trigger.current?.focus());
  }
  async function toggle() {
    if (expanded) {
      await exit();
      return;
    }
    if (status === 'running') onStatus('paused');
    setExpanded(true);
    try {
      await panel.current?.requestFullscreen();
    } catch {
      /* Focus view remains usable when native fullscreen is unavailable. */
    }
    requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLButtonElement>('[data-exit]')?.focus(),
    );
  }
  useEffect(() => {
    if (!expanded) return;
    const unlock = lockScroll();
    const change = () => {
      if (!document.fullscreenElement) {
        setExpanded(false);
        if (status === 'running') onStatus('paused');
        requestAnimationFrame(() => trigger.current?.focus());
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setExpanded(false);
        if (status === 'running') onStatus('paused');
        requestAnimationFrame(() => trigger.current?.focus());
      }
      if (e.key === 'Tab') {
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [role="separator"]',
          ) ?? [],
        ).filter((b) => b.getClientRects().length);
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('keydown', key);
    return () => {
      unlock();
      document.removeEventListener('fullscreenchange', change);
      window.removeEventListener('keydown', key);
    };
  }, [expanded, status, onStatus]);
  return { panel, trigger, expanded, toggle, exit };
}
