import Image from 'next/image';
import type { ConceptDefinition } from '@/concepts/types';

/** Concept screenshot that follows the gallery theme, or a tone block without one. */
export function ConceptShot({ concept, eager = false }: { concept: ConceptDefinition; eager?: boolean }) {
  const { preview } = concept;
  if (!preview) {
    return (
      <span className={`concept-shot concept-shot--${concept.tone}`}>
        <span className="concept-shot-title">{concept.title}</span>
      </span>
    );
  }
  const shared = { alt: preview.alt, sizes: eager ? '(max-width: 1400px) 94vw, 1320px' : '(max-width: 700px) 94vw, 420px', priority: eager };
  return (
    <span className="concept-shot" data-has-dark={preview.dark ? '' : undefined}>
      <Image className="shot-light" src={preview.light} {...shared} />
      {preview.dark && <Image className="shot-dark" src={preview.dark} {...shared} />}
    </span>
  );
}
