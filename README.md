# Sites

Storage for websites, one folder each. Apps that listen take a slot in
`19000–19999` ([PORTS.md](../PORTS.md)); a site shown through Site Atlas runs
inside it and has none. Two of them are galleries:

| Folder | What it is | Ports |
|---|---|---|
| [component-atlas](component-atlas/) | Browser for `../components`, linked whole as `src/library` | 19000 Vite dev · 19001 Vite preview |
| [site-atlas](site-atlas/) | Gallery of the sites here; each is linked in by `sites.json` | 19010 vinext dev · 19011 production server (`pnpm start`) |

No site is listed in Site Atlas at the moment. Free slots: 19020 and up.

Both galleries use Windows directory junctions (created by their `pnpm install`,
refreshed by `dev`/`build`/`lint`) and do not track them, so the folders they show
stay the only copy. A site shown by Site Atlas has no toolchain of its own: it is
type-checked, linted and built from `site-atlas/`.
