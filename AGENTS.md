# Project instructions

- Keep the gallery and concept implementations separate.
- Add each website concept under `concepts/<slug>` and register it explicitly in `concepts/catalog.ts`.
- Use CSS Modules for concept-specific styles. Do not add concept selectors to `app/globals.css`.
- Do not import code from one concept into another. Promote proven shared code to `components/` or `lib/` only when there are real consumers.
- Keep new concepts in `draft` until responsive, keyboard, touch, reduced-motion, lint, and build checks pass.
- Preserve the boundary between Site and Component Atlas: this repository holds complete site directions, not isolated effects or controls.
- Follow `docs/CONCEPT-GUIDE.md` for authoring and acceptance criteria.
