import Link from 'next/link';
import { concepts } from '@/concepts/catalog';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="gallery-shell">
      <header className="gallery-header">
        <Link className="wordmark" href="/" aria-label="Site Atlas home">
          <span className="wordmark-mark">SA</span>
          <span>Site Atlas</span>
        </Link>
        <div className="header-actions">
          <span className="header-orbit" aria-hidden="true"><i /></span>
          <ThemeToggle />
        </div>
      </header>
      <section className="gallery-intro" aria-labelledby="gallery-title">
        <div className="intro-art" aria-hidden="true"><span /><span /><span /></div>
        <h1 id="gallery-title">Site<br /><em>Atlas.</em></h1>
        <p className="intro-copy">Complete visual directions, interaction systems, and product narratives—each kept in its own boundary so it can evolve without compromise.</p>
      </section>
      <section className="concept-grid" aria-label="Concept website collection">
        {concepts.map((concept, index) => (
          <article className={`concept-card concept-card--${concept.tone}`} key={concept.slug}>
            <Link className="concept-preview" href={`/concepts/${concept.slug}`}>
              <span className="preview-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="preview-title">{concept.title}</span>
              <span className="preview-arrow" aria-hidden="true">↗</span>
            </Link>
            <div className="concept-meta">
              <div>
                <h2><Link href={`/concepts/${concept.slug}`}>{concept.title}</Link></h2>
                <p>{concept.summary}</p>
              </div>
              <dl>
                <div><dt>Type</dt><dd>{concept.type}</dd></div>
                <div><dt>Status</dt><dd>{concept.status}</dd></div>
                <div><dt>Year</dt><dd>{concept.year}</dd></div>
              </dl>
              <ul className="tag-list" aria-label="Tags">
                {concept.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <footer className="gallery-footer">
        <span>{String(concepts.length).padStart(2, '0')} published studies</span>
        <span>Site Atlas</span>
      </footer>
    </main>
  );
}
