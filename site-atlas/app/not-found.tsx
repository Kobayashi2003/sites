import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';

export default function NotFound() {
  return (
    <div className="gallery-shell">
      <SiteHeader />
      <main className="missing">
        <p className="plate-number">No plate here</p>
        <h1>This site isn’t in the gallery.</h1>
        <p>
          It may have been renamed or not linked yet. Sites appear once they are
          listed in <code>sites.json</code>.
        </p>
        <Link className="button-primary" href="/">
          See all sites
        </Link>
      </main>
    </div>
  );
}
