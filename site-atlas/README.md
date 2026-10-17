# Site Atlas

A gallery of complete website concepts, built with React, TypeScript, Vinext and Vite. Component
Atlas (`../component-atlas`) holds reusable parts; this holds whole sites.

Each site lives in its own folder, normally `../<slug>`. `sites.json` lists the sites shown, and
`scripts/link-sites.mjs` links each one at `concepts/<slug>` with a directory junction. A card
opens the site's overview at `/concepts/<slug>/overview`, which leads to the site at
`/concepts/<slug>`.

## Run

Requires Node.js and pnpm.

```bash
pnpm install    # also creates the links
pnpm dev        # http://127.0.0.1:19010
```

On Windows, `start.ps1` / `stop.ps1` start and stop the dev server and open it in the browser
(`-NoBrowser` to skip); `start.ps1 -Prod -Build` builds and serves production on 19011.

Before committing: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`. They cover
the atlas and every linked site.

## Adding a site

1. Create `../<slug>`; copying an existing site is the quickest start.
2. Fill in `meta.ts` (folder name and `slug` identical), with `preview` screenshots from
   `assets/` and `overview` copy.
3. Export `concept = { ...meta, Component }` from `index.tsx`.
4. Add `"<slug>": "../<slug>"` to `sites.json`; the next `dev`, `build` or `lint` links it.
5. Keep it `draft` until it is ready, then switch to `published`.

The rules are in the [Concept Authoring Guide](docs/CONCEPT-GUIDE.md); design decisions in
[Architecture](docs/ARCHITECTURE.md).

## Boundary with Component Atlas

Individual controls, effects and navigation patterns belong in `../../components`; work that
depends on a complete narrative or a dedicated visual language belongs in a site. A capability
proven in a site may be promoted once it works independently of the page. A site must not import
component demo code or internal paths.
