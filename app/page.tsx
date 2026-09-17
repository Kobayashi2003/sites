import Link from 'next/link';
import { concepts } from '@/concepts/catalog';
import { ConceptShot } from '@/components/concept-shot';
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
          <ThemeToggle />
        </div>
      </header>
      <section className="gallery-intro" aria-labelledby="gallery-title">
        <div className="intro-art" aria-hidden="true"><span /><span /><span /></div>
        <h1 id="gallery-title">Site <em>Atlas.</em></h1>
      </section>
      <div className="gallery-bar">
        <span>Index</span>
        <span>{String(concepts.length).padStart(2, '0')} published</span>
      </div>
      <section className="concept-grid" aria-label="Concept website collection">
        {concepts.map((concept, index) => (
          <article className="concept-card" key={concept.slug}>
            <div className="concept-card-media">
              <ConceptShot concept={concept} />
              <span className="concept-card-index">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="concept-card-body">
              <p className="concept-card-kicker">{concept.type} · {concept.year}</p>
              <h2><Link className="concept-card-link" href={`/concepts/${concept.slug}/overview`}>{concept.title}</Link></h2>
              <p className="concept-card-summary">{concept.summary}</p>
              <ul className="tag-list" aria-label="Tags">
                {concept.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </div>
            <span className="concept-card-arrow" aria-hidden="true">↗</span>
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
