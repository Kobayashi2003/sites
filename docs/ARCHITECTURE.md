# Architecture

## Purpose

Site solves three problems: complete concepts remain isolated from one another, Site Atlas can discover and present them consistently, and mature local capabilities can flow back into the component library. It is neither a collection of production products nor a general-purpose template marketplace.

## Runtime structure

```text
catalog.ts
   │
   ├── Gallery home: reads published entries only
   └── /concepts/[slug]: renders the matching Component
                              │
                              └── CSS Module + local assets
```

`catalog.ts` uses explicit registration instead of filesystem magic. This produces a stable dependency graph at build time and makes every addition or removal visible in code review. Adding an entry requires one import and one array member.

## Boundaries

### Gallery layer

`app/page.tsx`, `app/globals.css`, and the dynamic route belong to the gallery layer. This layer owns indexing, metadata presentation, document titles, and the not-found state. It does not prescribe the layout of an individual concept.

### Concept layer

`concepts/<slug>` is a self-contained boundary. A concept may contain internal components, hooks, and assets, but it exposes only one `concept` object through the directory-level `index.tsx`.

Concepts must not import from one another. Code should move into `components/` or `lib/` only after it has three or more real consumers and stable visual semantics. Page-specific typography and decoration stay inside the concept directory.

### Component Atlas

Site may eventually consume a stable Component Atlas package, but it must not depend on its demos, documentation files, or internal paths. Extraction follows one direction:

```text
Idea proven in Site → page-independent API → Component Atlas
```

Do not abstract unstable concept code merely in anticipation of reuse.

## Routes and publication states

- `/` displays entries with `status: 'published'` only.
- `/concepts/<slug>` renders any registered entry, allowing a `draft` to be reviewed through its direct URL.
- An unregistered slug enters the shared 404 page.
- An `archived` entry retains its source and direct URL but does not appear in the gallery.

## When to adopt a multi-application repository

All current concepts share the React and Vinext build chain, so a single application is the simplest option. Consider an `apps/` and `packages/` monorepo only when at least one of these conditions becomes real:

- A concept requires a different framework or runtime.
- A concept needs an independent server, authentication model, or database lifecycle.
- A concept needs its own deployment and versioning policy.
- A shared package already has clear consumers rather than hypothetical reuse.
