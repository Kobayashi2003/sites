# Site

Site is the project that powers Site Atlas, an independent gallery for complete website concepts. It preserves finished digital spaces, while the neighboring Component Atlas preserves reusable parts.

The project uses React, TypeScript, Vinext, and Vite. The gallery reads from a central catalog. Each gallery card opens an overview at `/concepts/<slug>/overview`, which leads to the concept's isolated route at `/concepts/<slug>`. Each concept owns its component, metadata, preview images and scoped styles.

## Getting started

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Before committing, run:

```bash
npm run lint
npm run build
```

## Project structure

```text
app/
  page.tsx                  Gallery home page
  globals.css               Global foundation styles for the gallery only
  concepts/[slug]/page.tsx  Shared route entry for concept pages
  concepts/[slug]/overview/ Preview, summary and entry point shown before a concept
components/
  concept-shot.tsx          Theme-aware concept screenshot for cards and overviews
concepts/
  catalog.ts                Entry registry and publication filtering
  types.ts                  Metadata contract
  <slug>/
    index.tsx               Public entry point for the concept
    meta.ts                 Title, status, tags, and other metadata
    styles.module.css       Concept-scoped styles
    assets/                 Preview screenshots and other concept media
docs/
  ARCHITECTURE.md           Project boundaries and technical structure
  CONCEPT-GUIDE.md          Authoring, maintenance, and acceptance rules
```

## Adding a concept

1. Copy an existing `concepts/<slug>` directory and rename it.
2. Update `meta.ts`, keeping the directory name and `slug` identical. Add `preview` screenshots from `assets/` and `overview` copy for the overview page.
3. Export `{ ...meta, Component }` from `index.tsx`.
4. Register the concept once in `concepts/catalog.ts`.
5. Use `draft` during development and switch to `published` when the work is ready to display.
6. Verify keyboard, touch, responsive, reduced-motion, lint, and build behavior.

See the [Concept Authoring Guide](docs/CONCEPT-GUIDE.md) for the complete rules and [Architecture](docs/ARCHITECTURE.md) for design decisions.

## Boundary with Component Atlas

- Individual controls, effects, navigation patterns, and input experiences belong in Component Atlas.
- Work that depends on a complete narrative, multiple sections, or a dedicated visual language belongs in Site.
- A capability proven inside a concept may be refined and promoted to Component Atlas once it works independently from the page.
- Site must not import Component Atlas demo code or internal paths. Shared code must use stable public exports.
