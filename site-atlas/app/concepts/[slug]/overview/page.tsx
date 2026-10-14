import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { concepts, getConcept } from '@/concepts/catalog';
import { ConceptShot } from '@/components/concept-shot';
import { SiteHeader } from '@/components/site-header';

export function generateStaticParams() {
  return concepts.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const concept = getConcept((await params).slug);
  return concept
    ? { title: `${concept.title}, overview`, description: concept.summary }
    : {};
}

const sentence = (text: string) => text[0].toUpperCase() + text.slice(1);

/** The step between the gallery and a site: preview, context and entry. */
export default async function ConceptOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const concept = getConcept((await params).slug);
  if (!concept) notFound();
  const index = concepts.findIndex(({ slug }) => slug === concept.slug);
  const href = `/concepts/${concept.slug}`;
  const facts = [
    { label: 'Type', value: sentence(concept.type) },
    { label: 'Status', value: sentence(concept.status) },
    { label: 'Year', value: String(concept.year) },
    { label: 'Tags', value: concept.tags.join(', ') },
  ];
  return (
    <div className="gallery-shell">
      <SiteHeader />
      <main className="study">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">All sites</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">
            {index >= 0
              ? `Plate ${String(index + 1).padStart(2, '0')}`
              : 'Draft'}
          </span>
        </nav>
        <section className="study-hero" aria-labelledby="study-title">
          <div>
            <h1 id="study-title">{concept.title}</h1>
            <p className="study-summary">{concept.summary}</p>
            <div className="plate-actions">
              <Link className="button-primary" href={href}>
                Open the site
              </Link>
              <Link className="button-quiet" href="/">
                Back to all sites
              </Link>
            </div>
          </div>
          <dl className="facts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <figure className="study-frame">
          <div className="study-frame-bar" aria-hidden="true">
            <code>{href}</code>
          </div>
          <Link
            className="study-frame-shot"
            href={href}
            aria-label={`Open ${concept.title}`}
          >
            <ConceptShot concept={concept} eager />
          </Link>
          {concept.preview && <figcaption>{concept.preview.alt}</figcaption>}
        </figure>
        {concept.overview && (
          <section className="study-body" aria-label="About this site">
            <div>
              <h2>About</h2>
              <p className="study-lede">{concept.overview.lede}</p>
            </div>
            <div>
              <h2>Highlights</h2>
              <ul className="study-highlights">
                {concept.overview.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Details</h2>
              <dl className="facts facts--stacked">
                {concept.overview.details.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}
      </main>
      <footer className="gallery-footer">
        <Link href="/">All sites</Link>
        <Link href={href}>Open {concept.title}</Link>
      </footer>
    </div>
  );
}
