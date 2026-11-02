# Sites

Websites, one folder each. Their ports are in [PORTS.md](PORTS.md). Two of them
are galleries, and no site is listed in Site Atlas at the moment.

| Project | What it does |
|---|---|
| [component-atlas](component-atlas/README.md) | Browser for `../components`, linked whole as `src/library` |
| [site-atlas](site-atlas/README.md) | Gallery of the sites here; each is linked in by `sites.json` |

Both galleries use Windows directory junctions (created by their `pnpm install`,
refreshed by `dev`/`build`/`lint`) and do not track them, so the folders they show
stay the only copy. A site shown by Site Atlas has no toolchain of its own: it is
type-checked, linted and built from `site-atlas/`.
