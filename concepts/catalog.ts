import { concept as fieldOffice } from './field-office';
import { concept as afterDark } from './after-dark';
import type { ConceptDefinition } from './types';

const allConcepts: ConceptDefinition[] = [fieldOffice, afterDark];

export const concepts = allConcepts.filter((concept) => concept.status === 'published');
export function getConcept(slug: string) { return allConcepts.find((concept) => concept.slug === slug); }
