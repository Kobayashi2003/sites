# Architecture

## Purpose

Site solves three problems: complete concepts remain isolated from one another, Site Atlas can discover and present them consistently, and mature local capabilities can flow back into the component library. It is neither a collection of production products nor a general-purpose template marketplace.

## Runtime structure

```text
sites.json ── scripts/link-sites.mjs ──> concepts/<slug>  (junction to ../<slug>)
                                               │
catalog.ts (import.meta.glob of ./*/index.tsx) ┘
   │
   ├── Gallery home: reads published entries only
   └── /concepts/[slug]: renders the matching Component
                              │
                              └── CSS Module + local assets
```

Sites are stored outside this project, one folder each, and `sites.json` is the explicit list of which ones are shown. Adding or removing a site is one line there, visible in code review. The catalog only discovers what is linked and checks that each site's `slug` matches its link name.

Vite resolves a junction to its real path, which would put a site's files outside this project. The `linked-sites` plugin in `vite.config.ts` maps every id inside a site back to its `concepts/<slug>` path, so the site resolves `react` and `next/*` from this project and its assets get ordinary URLs. TypeScript follows the junctions by itself. ESLint and Prettier do not, so `scripts/check.mjs` names each linked site for them.

## Boundaries

### Gallery layer

`app/page.tsx`, `app/globals.css`, and the dynamic route belong to the gallery layer. This layer owns indexing, metadata presentation, document titles, and the not-found state. It does not prescribe the layout of an individual concept.

### Concept layer

A site folder is a self-contained boundary. It may contain internal components, hooks, and assets, but it exposes only one `concept` object through its `index.tsx`. Beyond itself it imports only packages this project provides and the contract `@/concepts/types`.

Concepts must not import from one another. Code should move into `components/` or `lib/` only after it has three or more real consumers and stable visual semantics. Page-specific typography and decoration stay inside the concept directory.

### Component Atlas

Site may eventually consume a stable Component Atlas package, but it must not depend on its demos, documentation files, or internal paths. Extraction follows one direction:

```text
Idea proven in Site → page-independent API → Component Atlas
```

Do not abstract unstable concept code merely in anticipation of reuse.

## Routes and publication states

- `/` displays entries with `status: 'published'` only, as compact cards linking to their overview.
- `/concepts/<slug>/overview` shows the preview, summary, highlights and details, and links to the concept. It is available for every registered entry.
- `/concepts/<slug>` renders any registered entry, allowing a `draft` to be reviewed through its direct URL.
- A slug missing from `sites.json` enters the shared 404 page.
- An `archived` entry retains its source and direct URL but does not appear in the gallery.

## When to adopt a multi-application repository

All current sites share the React and Vinext build chain, so building them inside this one application is the simplest option. Give a site its own package and build, and link to its deployed URL instead, only when at least one of these conditions becomes real:

- A concept requires a different framework or runtime.
- A concept needs an independent server, authentication model, or database lifecycle.
- A concept needs its own deployment and versioning policy.
- A shared package already has clear consumers rather than hypothetical reuse.
