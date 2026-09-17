# DEXTRA / SIX

An English-language left-hand independence and rhythm practice studio at `/concepts/dextra`.

## Organization

- `components/workspace/`: application orchestration and the contextual practice guide.
- `components/ui/`: concept-local accessible select and icons.
- `features/falling/`: timed scrolling trainer and its playback lifecycle.
- `features/static/`: stationary chart and active-time practice.
- `features/library/`: exercise selection.
- `features/settings/`: timing windows, appearance and finger/key assignments.
- `features/results/`: reusable session result breakdown.
- `engine/`: pure chart generation, scoring and static state transitions, with Node tests.
- `model/`: shared domain types and keyboard defaults; no React hooks.
- `hooks/`: audio cues and fullscreen/focus-view lifecycle.
- `lib/`: scroll locking.
- `styles.module.css`: isolated tokens, layout, trainer, panels and responsive/motion rules, in that order.
- `assets/`: light and dark gallery preview screenshots (1440×900, captured paused mid-run).
- `index.tsx` and `meta.ts`: catalog entry, metadata, preview and overview copy. No cross-concept dependencies.

## Features

Five exercise plans, standard 32-group charts, timed random static practice (30/60/120 seconds), and falling survival (1/3/5/10 lives) with scoring. Falling retains BPM, scroll speed, chart height, adjustable timing windows, hit-window display. Both formats retain up/down direction, pause/resume, fullscreen with fallback, results, retry and local history. Six remappable keys retain configurable finger assignments.

The header provides System, Light and Dark themes. Preferences and history retain the original `dextra-v1`, `dextra-theme` and trainer display storage keys. No migration or external services are required. Decorative transitions only affect menus, panels, results and key feedback; reduced motion uses the existing fixed-preview trainer behavior.

Physical keyboard required for scored practice. Mobile layouts support browsing and configuration; touch is not an alternative scoring input.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `node --test concepts/dextra/engine/rhythm.test.mjs concepts/dextra/engine/static.test.mjs` (21 scoring/generation tests)
- `npm run build`

Browser checks: 1440px desktop and 320px mobile, light/system-dark appearances, theme selection via arrow keys and Enter, settings Escape and focus restoration, survival completion and result view, static playback and fullscreen exit/pause. At 320px, document scroll width equals client width.

Status: published on 2026-09-16 and listed on the Site Atlas home page. Browser checks covered reduced motion (fixed previews, no transitions), 200% zoom, keyboard focus order, and 320/380/820/1440px widths without horizontal overflow. A physical touch-device pass is still outstanding. Touch browsing and configuration are expected to work, but touch is not a scoring input.

## Lane personalization

Settings → Appearance → Lane & key colors provides independent track/key colors for all six lanes and track opacity from 0–80%. Default outer tracks are purple/red at 18%; inner tracks remain clear. Notes and key feedback use translucent colors. Settings persist separately in `dextra-appearance-v1`. Key sounds are controlled only in Settings, and play once per fresh mapped keydown during either practice format. Repeated keydown, paused sessions and remapping inputs are silent.

Settings is grouped into Sound, Appearance, Timing & judgement, and Keys & fingers. Per-lane color controls are collapsed by default under Appearance so the remaining settings stay easy to reach.

## Viewport studio update (2026-09-15)

Desktop uses independently scrolling left controls and right reference around a full-height center chart. The stage fills the viewport below the header. Fullscreen targets the entire stage (including its settings dialog), excludes the header, and retains all three columns. Running dims/blurs sidebars; keyboard focus restores legibility. Small screens stack panels with internal scrolling so controls remain reachable.

Static accepts correct fresh presses even if keys from the completed group are still held. Held shared keys cannot satisfy a second group until pressed again. Regression tests cover rapid overlapping singles and chords. Future static notes are dimmed.

Hit-window visualization defaults off and persists in `dextra-chart-v2`. Viewport sizing supersedes manual chart height. Arcaea tap defaults: Pure+ ±25 ms (feedback subdivision), Pure ±50 ms, Far ±100 ms. Internal perfect/good names and hit-rate summaries remain compatible with history; Arcaea point/bonus scoring is not reproduced. Settings provides the timing preset and custom ranges. Version 2 migrates earlier timing settings to 50/100 ms.

No verifiable In Falsus millisecond windows were located. Community references for the fallback: https://arcaea.fandom.com/wiki/Scoring and https://arcwiki.mcd.blue/机制 (accessed 2026-09-15). These are community-documented values, not an official lowiro specification.

Side panel widths are draggable and persisted in `dextra-panels`. Focus either divider and use arrow keys (Shift for 40px steps), Home/End, or double-click to reset. Widths are capped responsively; below 950px the reference moves below, and below 560px the panels stack. Desktop checks: three-column fullscreen, running blur, hit-window default off, 1440×900 viewport bounds and keyboard resize. 320×800 document bounds also remain within the viewport.

The left sidebar scrolls setup controls independently from its pinned playback footer. Start/Pause precedes End. Fullscreen remains available in the footer; Settings and History shortcuts appear there only while fullscreen hides the header.

## Panel layout update (2026-09-16)

`styles.module.css` was consolidated into one ordered sheet (tokens, base controls, header, layout, left panel, chart stage, right panel, drawer, results, motion, responsive); unused rules were removed. The left panel is grouped into Current exercise, Setup, Tempo (falling), Session and Display, with consistent 16px section padding and a session status card. Survival/timed fields sit side by side only when the panel is wide enough.

Both sidebars collapse into 52px rails, from the toggle in each panel, by pressing Enter on a focused divider, or by dragging a divider narrower than 120px. Dragging back out reopens the panel at 180px or wider; double-click resets width and reopens it. Folded state persists in `dextra-panels` (`leftCollapsed`, `rightCollapsed`) alongside the saved widths. The folded left rail keeps icon-only Start/Pause, End and Fullscreen. Folding is ignored where panels stack: the right panel below 950px, the left panel below 560px.

The right panel adds a Progress card for the loaded exercise, format and challenge. It shows run count, best and last result (accuracy, survival time, active time or groups), and the three most recent runs. Lane key chips use the configured lane colors, and the shared-finger note follows the current mapping.

Fixes: undefined `endButton`/`fallingControls` classes, Static key-row lane tint covering only the label, select labels drifting to the center, a hard-coded shared-pinky note, the dead result min-height state, and Static showing Start instead of Retry after completion.

## Scoring, live dock and survival update (2026-09-16)

Falling runs are scored by DEXTRA rules; Arcaea scoring is not reproduced. Points are per key in a group: Pure+ 300, Pure 250, Far 100, and Miss or Extra 0, so chords score once per key. Every 10 consecutive groups add a 5% combo multiplier, capped at +50% from a 100 combo. Fixed charts also compute a maximum score and a rank: S at 95% or more of the maximum, then A 85%, B 70%, C 50%, and D below that. Survival records only a score. Results, history and the Progress card show the score; records saved before this update keep their accuracy view.

Survival offers 1, 3, 5 or 10 lives. While a run is playing, only the setup scroll area and the guide soften. The left footer stays sharp as a live dock: status, progress or hearts, Pause/Resume, End and Fullscreen. A HUD strip above the chart shows score, combo and accuracy or lives for Falling, and remaining or active time, groups and accuracy for Static. End returns focus to Start, and result actions stay pinned while the breakdown scrolls.

Selected controls use a tonal `--chosen` color pair in both themes instead of a solid fill, text selection follows the theme, and checkboxes render as themed switches. Tests: `node --test concepts/dextra/engine/rhythm.test.mjs concepts/dextra/engine/static.test.mjs` (21 tests).

Scrollbars inside the concept use a slim rounded thumb on a clear track. Colors come from `--scroll-thumb` and `--scroll-thumb-hover`, and an active thumb uses the accent color. Chromium and Safari use `::-webkit-scrollbar`. Other browsers fall back to `scrollbar-width: thin` and `scrollbar-color`, which applies only where the pseudo-elements are unsupported because the standard properties disable them in Chromium.

## Entrance and gallery preview (2026-09-17)

`IntroCurtain` covers the studio on first load in each browser session. Six notes in the configured lane colors land on a hit line, the wordmark settles, and the curtain fades after about 1.25 seconds, once preferences have loaded. It is `aria-hidden`, ignores pointer input while fading, and is skipped for the rest of the session (`dextra-intro-seen` in sessionStorage). Reduced motion shows a static mark for 0.5 seconds. Start and End now stack when the left panel is too narrow for both labels.
