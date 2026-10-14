# Component Atlas

Component Atlas is the browser for the components stored in `../../components`.
Each entry has a live demo, usage notes, and source code. Public imports do not
load showcase code.

## Get started

```bash
pnpm install
pnpm dev
```

`pnpm install` links `src/library` to `../../components` with a directory
junction (`scripts/link-library.mjs`); `dev`, `build`, `typecheck` and `lint` make
sure the link exists first. The dev server listens on `http://127.0.0.1:19000`
(see `PORTS.md` at the root of `Code/`). On Windows, `start.ps1` / `stop.ps1` start
and stop it.

Before finishing a change, run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
and `pnpm build`. These cover the linked components too.

## Repository map

| Path                            | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `src/App.tsx`, `src/styles.css` | Catalog UI and global styles                           |
| `src/catalog/`                  | Category discovery, entry validation, and lazy loading |
| `src/components/`               | Components used by the catalog UI                      |
| `src/shared/`                   | Infrastructure unrelated to a specific entry           |
| `src/library/`                  | Junction to `../../components`; not tracked here       |
| `scripts/link-library.mjs`      | Creates or repairs the junction                        |

The catalog uses `#/`, `#/category/<category>`, and `#/entry/<category>/<slug>`. Metadata loads for the listing; demos and documentation load when an entry is opened. The home page searches every entry's title, summary, category and tags (`/` focuses the field), and a category page filters by any tag that two or more of its entries share.

Categories are not registered here: every directory of the library with a
`README.md` is one. How to add entries and categories is in
[the components README](../../components/README.md).

## Working with the link

Vite and TypeScript see library files at their real paths, outside this project.
Three settings make that work, and a new runtime package used by an entry needs
no more than a `pnpm add` here:

- `vite.config.ts` dedupes React and allows the dev server to serve the library.
- `tsconfig.app.json` resolves bare imports from this project's `node_modules`.
- ESLint is given `src/library` explicitly, and Prettier checks `../../components`
  with that folder's own config and ignore file, because neither follows a
  junction on its own.
