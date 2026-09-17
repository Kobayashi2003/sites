import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { concepts, getConcept } from '@/concepts/catalog';
import { ConceptShot } from '@/components/concept-shot';
import { ThemeToggle } from '@/components/theme-toggle';

export function generateStaticParams() { return concepts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const concept = getConcept((await params).slug);
  return concept ? { title: `${concept.title} — Overview`, description: concept.summary } : {};
}

/** The step between the gallery and a concept: preview, context and entry. */
export default async function ConceptOverview({ params }: { params: Promise<{ slug: string }> }) {
  const concept = getConcept((await params).slug);
  if (!concept) notFound();
  const index = concepts.findIndex(({ slug }) => slug === concept.slug);
  const href = `/concepts/${concept.slug}`;
  const facts = [
    { label: 'Type', value: concept.type },
    { label: 'Status', value: concept.status },
    { label: 'Year', value: String(concept.year) },
  ];
  return (
    <main className="gallery-shell study">
      <header className="gallery-header">
        <Link className="wordmark" href="/" aria-label="Site Atlas home">
          <span className="wordmark-mark">SA</span>
          <span>Site Atlas</span>
        </Link>
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </header>
      <nav className="study-crumbs" aria-label="Breadcrumb">
        <Link href="/">← Index</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{index >= 0 ? String(index + 1).padStart(2, '0') : 'Draft'} · {concept.slug}</span>
      </nav>
      <section className="study-hero" aria-labelledby="study-title">
        <div className="study-heading">
          <p className="study-kicker">{concept.type}</p>
          <h1 id="study-title">{concept.title}</h1>
          <p className="study-summary">{concept.summary}</p>
          <div className="study-actions">
            <Link className="study-open" href={href}>Open site <span aria-hidden="true">↗</span></Link>
            <Link className="study-back" href="/">Back to index</Link>
          </div>
        </div>
        <dl className="study-facts">
          {facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          <div><dt>Tags</dt><dd>{concept.tags.join(' · ')}</dd></div>
        </dl>
      </section>
      <figure className="study-frame">
        <div className="study-frame-bar" aria-hidden="true">
          <span /><span /><span />
          <code>{href}</code>
        </div>
        <Link className="study-frame-shot" href={href} aria-label={`Open ${concept.title}`}>
          <ConceptShot concept={concept} eager />
        </Link>
        {concept.preview && <figcaption>{concept.preview.alt}</figcaption>}
      </figure>
      {concept.overview && (
        <section className="study-body" aria-label="About this study">
          <div>
            <h2>About</h2>
            <p className="study-lede">{concept.overview.lede}</p>
          </div>
          <div>
            <h2>Highlights</h2>
            <ul className="study-highlights">
              {concept.overview.highlights.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h2>Details</h2>
            <dl className="study-details">
              {concept.overview.details.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            </dl>
          </div>
        </section>
      )}
      <footer className="gallery-footer">
        <Link href="/">← Site Atlas index</Link>
        <Link href={href}>Open {concept.slug} ↗</Link>
      </footer>
    </main>
  );
}
