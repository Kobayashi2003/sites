import type { ConceptDefinition } from './types';
import { concept as dextraConcept } from './dextra';

const allConcepts: ConceptDefinition[] = [dextraConcept];

export const concepts = allConcepts.filter(
  (concept) => concept.status === 'published',
);
export function getConcept(slug: string) {
  return allConcepts.find((concept) => concept.slug === slug);
}
