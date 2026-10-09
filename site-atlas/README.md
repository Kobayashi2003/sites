# Site Atlas

Site Atlas is a gallery of complete website concepts. It preserves finished digital spaces, while Component Atlas (`../component-atlas`) preserves reusable parts.

The project uses React, TypeScript, Vinext, and Vite. Each site lives in its own folder, normally `../<slug>`, and is linked in one at a time: `sites.json` maps a slug to the site's folder, and `scripts/link-sites.mjs` turns every entry into a directory junction at `concepts/<slug>`. Each gallery card opens an overview at `/concepts/<slug>/overview`, which leads to the site's isolated route at `/concepts/<slug>`.

## Getting started

Node.js 22.13 or newer and pnpm are required.

```bash
pnpm install
pnpm dev
```

`pnpm install` creates the links; `dev`, `build`, `typecheck`, `lint` and `format` refresh them first, and drop links for sites no longer listed. The dev server listens on `http://127.0.0.1:19010` (see `playround/app-gateway/PORTS.md`).

Before committing, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

All four cover the atlas and every linked site. ESLint and Prettier do not follow junctions on their own, so `scripts/check.mjs` passes ESLint each `concepts/<slug>` link and Prettier each site's real folder, with this project's `.prettierrc.json`.

## Project structure

```text
sites.json                  Slug → site folder; the list of sites shown here
scripts/link-sites.mjs      Creates, repairs and removes the junctions
scripts/check.mjs           ESLint / Prettier over the atlas and each linked site
app/
  page.tsx                  Gallery home page
  globals.css               Global foundation styles for the gallery only
  concepts/[slug]/page.tsx  Shared route entry for concept pages
  concepts/[slug]/overview/ Preview, summary and entry point shown before a concept
components/
  concept-shot.tsx          Theme-aware concept screenshot for cards and overviews
concepts/
  catalog.ts                Discovers linked sites and filters by publication state
  types.ts                  Metadata contract
  <slug>/                   Junction to the site's folder; not tracked here
docs/
  ARCHITECTURE.md           Project boundaries and technical structure
  CONCEPT-GUIDE.md          Authoring, maintenance, and acceptance rules
```

## Adding a site

1. Create `../<slug>` (copying an existing site is the quickest start).
2. Update `meta.ts`, keeping the folder name and `slug` identical. Add `preview` screenshots from `assets/` and `overview` copy for the overview page.
3. Export `concept = { ...meta, Component }` from `index.tsx`.
4. Add `"<slug>": "../<slug>"` to `sites.json`, then run `pnpm link:sites` (or any of `dev`, `build`, `lint`).
5. Use `draft` during development and switch to `published` when the work is ready to display.
6. Verify keyboard, touch, responsive, reduced-motion, lint, and build behavior.

See the [Concept Authoring Guide](docs/CONCEPT-GUIDE.md) for the complete rules and [Architecture](docs/ARCHITECTURE.md) for design decisions.

## Boundary with Component Atlas

- Individual controls, effects, navigation patterns, and input experiences belong in `../../components`, shown by Component Atlas.
- Work that depends on a complete narrative, multiple sections, or a dedicated visual language belongs in a site.
- A capability proven inside a site may be refined and promoted to `../../components` once it works independently from the page.
- A site must not import component demo code or internal paths. Shared code must use stable public exports.
