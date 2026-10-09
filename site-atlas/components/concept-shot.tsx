import type { ConceptDefinition } from '@/concepts/types';

/** Concept screenshot that follows the gallery theme, or a tone block without one. */
export function ConceptShot({
  concept,
  eager = false,
}: {
  concept: ConceptDefinition;
  eager?: boolean;
}) {
  const { preview } = concept;
  if (!preview) {
    return (
      <span className={`concept-shot concept-shot--${concept.tone}`}>
        <span className="concept-shot-title">{concept.title}</span>
      </span>
    );
  }
  // vinext serves local images unresized in production, so a plain <img> with
  // its intrinsic size is all next/image would do here.
  const shared = {
    alt: preview.alt,
    loading: eager ? ('eager' as const) : ('lazy' as const),
    decoding: 'async' as const,
  };
  return (
    <span
      className="concept-shot"
      data-has-dark={preview.dark ? '' : undefined}
    >
      <img
        className="shot-light"
        src={preview.light.src}
        width={preview.light.width}
        height={preview.light.height}
        {...shared}
      />
      {preview.dark && (
        <img
          className="shot-dark"
          src={preview.dark.src}
          width={preview.dark.width}
          height={preview.dark.height}
          {...shared}
        />
      )}
    </span>
  );
}
