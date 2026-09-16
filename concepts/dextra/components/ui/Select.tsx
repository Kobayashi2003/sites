'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Custom select keeps explicit ARIA roles while allowing themed options. */
import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';
import s from '../../styles.module.css';
type Option = { value: string; label: string };
export default function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
  icon,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  icon?: IconName;
}) {
  const [open, setOpen] = useState(false),
    [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function show() {
    const box = trigger.current?.getBoundingClientRect();
    setAbove(
      !!box &&
        box.bottom + Math.min(options.length * 40 + 12, 220) > innerHeight,
    );
    setOpen(true);
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus(),
    );
  }
  function choose(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      ref={root}
      className={s.selectControl}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            show();
          }
        }}
      >
        {icon && <Icon name={icon} />}
        <span>{options.find((o) => o.value === value)?.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          className={s.selectMenu}
          data-above={above}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              trigger.current?.focus();
              return;
            }
            const buttons = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="option"]',
              ),
            );
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            let next = index;
            if (e.key === 'ArrowDown') next = (index + 1) % buttons.length;
            else if (e.key === 'ArrowUp')
              next = (index - 1 + buttons.length) % buttons.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = buttons.length - 1;
            else if (e.key.length === 1) {
              const found = options.findIndex((o) =>
                o.label.toLowerCase().startsWith(e.key.toLowerCase()),
              );
              if (found >= 0) next = found;
              else return;
            } else return;
            e.preventDefault();
            buttons[next]?.focus();
          }}
        >
          {options.map((o) => (
            <button
              type="button"
              tabIndex={-1}
              role="option"
              aria-selected={value === o.value}
              key={o.value}
              onClick={() => choose(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4 10-10" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
