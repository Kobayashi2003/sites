# Sites

Storage for websites, one folder each. Two of them are galleries:

| Folder             | What it is                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| `component-atlas/` | Browser for `../components`, linked whole as `src/library`. Port 19000.   |
| `site-atlas/`      | Gallery of the sites here; each is linked in by `sites.json`. Port 19010. |

No site is listed in Site Atlas at the moment.

Both galleries use Windows directory junctions (created by their `pnpm install`,
refreshed by `dev`/`build`/`lint`) and do not track them, so the folders they show
stay the only copy. A site shown by Site Atlas has no toolchain of its own: it is
type-checked, linted and built from `site-atlas/`.
