import Link from 'next/link';
import { concepts } from '@/concepts/catalog';
import { ConceptShot } from '@/components/concept-shot';
import { SiteHeader } from '@/components/site-header';

const plate = (index: number) => String(index + 1).padStart(2, '0');

export default function Home() {
  return (
    <div className="gallery-shell">
      <SiteHeader />
      <main>
        <section className="intro" aria-labelledby="gallery-title">
          <h1 id="gallery-title">Site Atlas</h1>
          <p>
            Complete website concepts, each running live in this gallery. Open
            one to use it, or read its overview first.
          </p>
          <p className="intro-count">
            {concepts.length === 1
              ? 'One published site'
              : `${concepts.length} published sites`}
          </p>
        </section>

        {concepts.length === 0 ? (
          <p className="empty">
            Nothing is published yet. Sites listed in <code>sites.json</code>{' '}
            appear here once their status is published.
          </p>
        ) : (
          <ol className="plates">
            {concepts.map((concept, index) => (
              <li key={concept.slug} className="plate">
                <Link
                  className="plate-shot"
                  href={`/concepts/${concept.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <ConceptShot concept={concept} eager={index === 0} />
                </Link>
                <div className="plate-text">
                  <p className="plate-number">Plate {plate(index)}</p>
                  <h2 id={`plate-${concept.slug}`}>{concept.title}</h2>
                  <p className="plate-kind">
                    {concept.type[0].toUpperCase() + concept.type.slice(1)},{' '}
                    {concept.year}
                  </p>
                  <p className="plate-summary">{concept.summary}</p>
                  <ul className="tag-list" aria-label="Tags">
                    {concept.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                  <div className="plate-actions">
                    <Link
                      className="button-primary"
                      href={`/concepts/${concept.slug}`}
                    >
                      Open the site
                    </Link>
                    <Link
                      className="button-quiet"
                      href={`/concepts/${concept.slug}/overview`}
                    >
                      Read the overview
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
      <footer className="gallery-footer">
        <span>Site Atlas</span>
        <span>Reusable parts live in Component Atlas.</span>
      </footer>
    </div>
  );
}
