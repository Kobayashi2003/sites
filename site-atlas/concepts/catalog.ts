import type { ConceptDefinition } from './types';

// Each concepts/<slug> is a link to a site folder, made from sites.json by
// scripts/link-sites.mjs. A site's index.tsx exports `concept`.
const modules = import.meta.glob<{ concept: ConceptDefinition }>(
  './*/index.tsx',
  {
    eager: true,
  },
);

const allConcepts: ConceptDefinition[] = Object.entries(modules).map(
  ([path, { concept }]) => {
    const slug = path.split('/')[1];
    if (concept?.slug !== slug) {
      throw new Error(
        `Site linked at concepts/${slug} must export a concept with slug "${slug}".`,
      );
    }
    return concept;
  },
);

export const concepts = allConcepts.filter(
  (concept) => concept.status === 'published',
);
export function getConcept(slug: string) {
  return allConcepts.find((concept) => concept.slug === slug);
}
