# Project instructions

- Keep the gallery and site implementations separate.
- A site lives in its own folder (normally `../<slug>`) and is shown here by adding it to `sites.json`, which links it at `concepts/<slug>`. Edit sites in their own folders; the links are not tracked here.
- A site imports only from itself, packages this project provides (`react`, `next/*`), and the contract `@/concepts/types`. New packages a site needs are added here with `pnpm add`.
- Use CSS Modules for site-specific styles. Do not add site selectors to `app/globals.css`.
- Do not import code from one site into another. Promote proven shared code to `components/` or `lib/` only when there are real consumers.
- Keep new sites in `draft` until responsive, keyboard, touch, reduced-motion, lint, and build checks pass.
- Preserve the boundary between Site Atlas and Component Atlas: this gallery holds complete site directions, not isolated effects or controls.
- Follow `docs/CONCEPT-GUIDE.md` for authoring and acceptance criteria.
- Use pnpm. Before handing off: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`.
