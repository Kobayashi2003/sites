import type { ReactNode } from 'react';
import s from './PanelSection.module.css';

export default function PanelSection({
  id,
  title,
  children,
  className = '',
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`${s.section} ${className}`.trim()}
      aria-labelledby={id}
    >
      <h3 className={s.heading} id={id}>
        {title}
      </h3>
      {children}
    </section>
  );
}
