import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

/** The gallery's top bar, shared by the index and every overview. */
export function SiteHeader() {
  return (
    <header className="gallery-header">
      <Link className="wordmark" href="/" aria-label="Site Atlas home">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <rect x="6" y="6" width="12" height="8" rx="1" />
          <path d="M6 17.5h7" />
        </svg>
        <span>Site Atlas</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
