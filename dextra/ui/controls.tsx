import { useId } from 'react';
import type { ReactNode } from 'react';
import s from '../styles.module.css';

type Option<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
};

/** A one-of-few choice, built on native radios for keyboard behaviour. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  hideLabel,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={s.segmentedField} disabled={disabled}>
      <legend className={hideLabel ? s.srOnly : s.fieldLabel}>{label}</legend>
      <div className={s.segmented}>
        {options.map((option) => (
          <label
            key={option.value}
            title={option.title}
            data-disabled={option.disabled || undefined}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A labelled range with its current value shown beside the label. */
export function Slider({
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  display: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={s.field}>
      <div className={s.fieldRow}>
        <label className={s.fieldLabel} htmlFor={id}>
          {label}
        </label>
        <output className={s.fieldValue} htmlFor={id}>
          {display}
        </output>
      </div>
      <input
        id={id}
        className={s.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && (
        <small id={`${id}-hint`} className={s.fieldHint}>
          {hint}
        </small>
      )}
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  disabled,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={s.switchField}>
      <label className={s.switchRow}>
        <span>{label}</span>
        <input
          type="checkbox"
          role="switch"
          className={s.switch}
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? id : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
      {description && (
        <small id={id} className={s.fieldHint}>
          {description}
        </small>
      )}
    </div>
  );
}
