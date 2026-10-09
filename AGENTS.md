# Sites

One folder per website; see [README.md](README.md). Work inside the folder you
are changing and follow its own `AGENTS.md`.

- A site shown by Site Atlas follows `site-atlas/AGENTS.md` and
  `site-atlas/docs/CONCEPT-GUIDE.md`, and is checked from `site-atlas/`
  (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`).
- Never edit through a gallery's junction (`component-atlas/src/library`,
  `site-atlas/concepts/<slug>`) as if it were the gallery's own code; it is the
  linked folder.
- This file is the only agent instruction file; `CLAUDE.md` imports it.
