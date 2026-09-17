# Concept Authoring Guide

## 1. Admission criteria

An entry should express a complete website direction rather than an isolated component. It must have a clear subject, page hierarchy, visual language, and primary browsing path. If the work remains essentially unchanged after removing the surrounding page, it probably belongs in Component Atlas.

Keep one primary proposition per entry. “A nighttime program experience for an independent cinema” is a proposition; “uses red” and “has hover animation” are not.

## 2. Naming

- Use lowercase kebab-case for the directory and `slug`, such as `after-dark`.
- Use PascalCase for the component, such as `AfterDark`.
- Titles may be brand-like, but must not use real brands without permission.
- Name assets by their content and purpose; avoid names such as `final-2.png`.

## 3. Required files

```text
concepts/<slug>/
  index.tsx
  meta.ts
  styles.module.css
```

Complex entries may add directories by responsibility:

```text
components/  Components internal to the concept
hooks/       Interaction state internal to the concept
assets/      Media owned by the concept
data.ts      Presentation data
```

Do not create empty directories solely for structural symmetry.

## 4. Metadata contract

```ts
export const meta = {
  slug: 'example-concept',
  title: 'Example Concept',
  summary: 'One sentence describing the audience and central experience.',
  type: 'landing page',
  status: 'draft',
  year: 2026,
  tags: ['editorial', 'typography'],
  tone: 'night',
  preview: { light: previewLight, dark: previewDark, alt: 'What the screenshot shows.' },
  overview: { lede: '…', highlights: ['…'], details: [{ label: 'Input', value: '…' }] },
} satisfies ConceptMeta;
```

- `summary` describes the work itself; it is not a marketing slogan.
- `type` and `status` must use the controlled values in `concepts/types.ts`.
- Use two to four stable, conceptual tags rather than implementation details.
- `tone` colors the fallback card block when no `preview` exists and must not leak into the concept page.
- `preview` imports screenshots from `concepts/<slug>/assets/` (1440×900 JPEG works well). `dark` is optional and appears when the gallery uses its dark theme. `alt` describes the captured state.
- `overview` supplies the About, Highlights and Details sections of `/concepts/<slug>/overview`. Without it, the overview shows only the header and preview.

## 5. Style isolation

- Use CSS Modules for concept-specific styles by default.
- Establish local design tokens on the concept root instead of relying on gallery color variables.
- Never modify global selectors such as `html`, `body`, or `*` from a concept directory.
- Motion must respect `prefers-reduced-motion`.
- The primary browsing path must remain usable at a 320px viewport width and 200% text zoom.
- Body copy should generally be at least 16px; frequently used labels should generally be at least 14px.

## 6. Content and assets

- Use specific, credible sample copy instead of lorem ipsum.
- Use fictional brands or real assets for which permission has been obtained.
- Images require stable dimensions, a suitable format, and meaningful alternative text. Purely decorative images use an empty `alt` value.
- Do not embed large base64 assets in component source.
- Document the source, license, and failure behavior of remote dependencies.

## 7. Interaction and accessibility

- Prefer semantic HTML. Links navigate; buttons perform actions.
- Every primary capability must work from a keyboard and show visible focus.
- Hover must not be the only way to reveal essential information.
- Touch targets should be at least 44 by 44 CSS pixels where practical.
- Use an appropriate live region for meaningful dynamic updates, but keep decorative animation out of the accessibility tree.

## 8. Registration and state transitions

Import the entry in `concepts/catalog.ts` and add it to `allConcepts`:

```ts
import { concept as exampleConcept } from './example-concept';

const allConcepts = [exampleConcept];
```

Recommended state flow:

```text
draft → published → archived
```

Before publication, confirm that:

- Metadata, directory name, and route agree.
- Desktop and mobile layouts have no unintended horizontal overflow.
- Keyboard focus, links, and buttons behave correctly.
- Reduced-motion preferences are respected.
- There are no cross-concept imports or leaking global styles.
- `npm run lint` and `npm run build` pass.

## 9. Promotion to Component Atlas

Promote a capability only after it has stabilized inside a concept and meets all of these conditions:

- It can be named without referring to a brand.
- Its API does not need to know the surrounding page copy or layout.
- A second real use case exists.
- Keyboard, touch, and reduced-motion behavior can be documented independently.

After promotion, the concept should consume the stable public API. Do not keep two copied implementations evolving in parallel.
