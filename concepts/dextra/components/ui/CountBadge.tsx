import type { ReactNode } from 'react';
import s from './CountBadge.module.css';

export default function CountBadge({ children }: { children: ReactNode }) {
  return <span className={s.badge}>{children}</span>;
}
