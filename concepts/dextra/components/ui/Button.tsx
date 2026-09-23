import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'primary' | 'danger';
};

/** Shared Dextra action button; behavior stays native while tone stays consistent. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone = 'default', className = '', ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      className={`${s.button} ${s[tone]} ${className}`.trim()}
    />
  );
});

export default Button;
