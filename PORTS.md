# sites ports

Range `19000–19999`, in slots of 10; the rules are in the root
[PORTS.md](../PORTS.md). A site shown through Site Atlas runs inside it and has
no slot.

| Project | Slot | Ports |
|---|---|---|
| component-atlas | 19000–19009 | 19000 Vite dev · 19001 Vite preview |
| site-atlas | 19010–19019 | 19010 vinext dev · 19011 production server (`pnpm start`) |

Lowest free slot: 19020.
