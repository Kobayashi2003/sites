import type { ConceptDefinition } from './types';

const allConcepts: ConceptDefinition[] = [];

export const concepts = allConcepts.filter(
  (concept) => concept.status === 'published',
);
export function getConcept(slug: string) {
  return allConcepts.find((concept) => concept.slug === slug);
}
