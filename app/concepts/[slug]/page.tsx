import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { concepts, getConcept } from '@/concepts/catalog';

export function generateStaticParams() { return concepts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const concept = getConcept((await params).slug);
  return concept ? { title: concept.title, description: concept.summary } : {};
}
export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const concept = getConcept((await params).slug);
  if (!concept) notFound();
  const Concept = concept.Component;
  return <Concept />;
}
