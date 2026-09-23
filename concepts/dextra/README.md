# DEXTRA / SIX

An English-language left-hand independence and rhythm practice studio at `/concepts/dextra`.

## Organization

- `components/workspace/`: application orchestration and structural workspace components.
- `components/ui/`: concept-local primitives for buttons, badges, panel sections, selects, meters and icons.
- `features/falling/`: timed scrolling trainer and its playback lifecycle.
- `features/static/`: stationary chart and active-time practice.
- `features/library/`: exercise selection.
- `features/settings/`: timing windows, appearance and finger/key assignments.
- `features/results/`: reusable session result breakdown.
- `engine/`: pure chart generation, scoring and static state transitions, with Node tests.
- `model/`: shared domain types and keyboard defaults; no React hooks.
- `hooks/`: audio cues, fullscreen/focus-view lifecycle, the song library and the song player clock.
- `lib/`: scroll locking, IndexedDB song storage and audio decoding.
- `styles.module.css`: theme tokens, type scale, native-control normalization and global accessibility rules only. Component and feature styles are colocated in same-named CSS Modules.
- `assets/`: light and dark gallery preview screenshots (1440×900, captured paused mid-run).
- `index.tsx` and `meta.ts`: catalog entry, metadata, preview and overview copy. No cross-concept dependencies.

## Features

Five exercise plans, standard 32-group charts, timed random static practice (30/60/120 seconds), and falling survival (1/3/5/10 lives) with scoring. Falling retains BPM, scroll speed, chart height, adjustable timing windows, hit-window display. Both formats retain up/down direction, pause/resume, fullscreen with fallback, results, retry and local history. Six remappable keys retain configurable finger assignments.

The header provides System, Light and Dark themes. Preferences and history persist locally under semantic Dextra storage keys; obsolete versioned keys are removed after migration. No external services are required. Decorative transitions only affect menus, panels, results and key feedback; reduced motion uses the existing fixed-preview trainer behavior.

Physical keyboard required for scored practice. Mobile layouts support browsing and configuration; touch is not an alternative scoring input.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `node --test concepts/dextra/engine/*.test.mjs` (40 tests: scoring, generation, records, Hanon, static play, and song analysis on a synthetic click track)
- `npm run build`

Browser checks: 1440px desktop and 320px mobile, light/system-dark appearances, theme selection via arrow keys and Enter, settings Escape and focus restoration, survival completion and result view, static playback and fullscreen exit/pause. At 320px, document scroll width equals client width.

Status: published on 2026-09-16 and listed on the Site Atlas home page. Browser checks covered reduced motion (fixed previews, no transitions), 200% zoom, keyboard focus order, and 320/380/820/1440px widths without horizontal overflow. A physical touch-device pass is still outstanding. Touch browsing and configuration are expected to work, but touch is not a scoring input.

## Lane personalization

Settings → Appearance → Lane & key colors provides independent track/key colors for all six lanes and track opacity from 0–80%. Default outer tracks are purple/red at 18%; inner tracks remain clear. Notes and key feedback use translucent colors. Appearance persists separately in `dextra-appearance`. Key sounds are controlled only in Settings, and play once per fresh mapped keydown during either practice format. Repeated keydown, paused sessions and remapping inputs are silent.

Settings is grouped into Sound, Appearance, Timing & judgement, and Keys & fingers. Per-lane color controls are collapsed by default under Appearance so the remaining settings stay easy to reach.

## Viewport studio update (2026-09-15)

Desktop uses independently scrolling left controls and right reference around a full-height center chart. The stage fills the viewport below the header. Fullscreen targets the entire stage (including its settings dialog), excludes the header, and retains all three columns. Running dims/blurs sidebars; keyboard focus restores legibility. Small screens stack panels with internal scrolling so controls remain reachable.

Static accepts correct fresh presses even if keys from the completed group are still held. Held shared keys cannot satisfy a second group until pressed again. Regression tests cover rapid overlapping singles and chords. Future static notes are dimmed.

Hit-window visualization defaults off and persists in `dextra-display`. Viewport sizing supersedes manual chart height. Arcaea tap defaults: Pure+ ±25 ms (feedback subdivision), Pure ±50 ms, Far ±100 ms. Internal perfect/good names and hit-rate summaries remain compatible with history; Arcaea point/bonus scoring is not reproduced. Settings provides default and custom timing ranges.

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

`IntroCurtain` covers the studio on first load in each browser session. Six notes in the configured lane colors land on a hit line, the wordmark settles, and the curtain fades after about 1.25 seconds, once preferences have loaded. It is `aria-hidden`, ignores pointer input while fading, and is skipped for the rest of the session (`dextra-intro-seen` in sessionStorage). Reduced motion shows a static mark for 0.5 seconds.

## Judgement colors and interaction states (2026-09-17)

Judgements have their own color tokens, used by the chart callout, in-lane feedback and result breakdown: Pure+ (`--grade-plus`, cyan), Pure (`--grade-pure`, blue), Far (`--grade-far`, amber), Miss (`--grade-miss`, red) and Extra (`--grade-extra`, magenta). Any element with `data-grade` exposes `--grade`. Pure+ uses the engine's `PURE_PLUS_WINDOW`, capped by the Pure window.

Keyboard focus is a 2px `--focus` ring with a 2px offset. Controls that sit edge to edge or inside clipping containers (stepper, Display summary, rail toggle, history rows) draw the ring inset. Enabled buttons press down 1px. Secondary actions take the tonal selection pair on hover, and End warns in the danger color. Select triggers highlight their border and flip the chevron while open, and switches and range inputs show pointer affordances.

## Imported songs (2026-09-17)

Library → My songs imports an audio file (drag and drop or file picker; MP3, OGG, WAV or M4A up to 40 MB, 10 seconds to 15 minutes). Everything stays in the browser: the file and its analysis are stored in IndexedDB (`dextra-songs`), and nothing is uploaded.

Analysis (`engine/audio.ts`, pure and tested in Node):

1. The browser decodes the file and resamples it to 22.05 kHz mono with `OfflineAudioContext`.
2. Log-spectral flux is split into low (<200 Hz), mid and high bands (1024-sample Hann frames, 20 ms hop). Event times are placed three quarters into each frame to offset the look-ahead of log flux.
3. Tempo comes from the autocorrelated onset envelope with a prior centred on 120 BPM. It is refined within ±2% jointly with the beat phase.
4. Onsets are local peaks above an adaptive threshold. A weaker echo within 120 ms of a stronger peak is dropped. Strength becomes the onset's rank within the song, so thresholds do not depend on loudness.

Charts (`generateChart`) snap onsets to the grid: Easy uses beats, Normal half beats and Hard quarter beats. Onsets further than 35% of a step (and at most 120 ms) from the grid are ignored. Each level applies a minimum gap, a rank threshold and a chord threshold.

- Lanes follow the band: lows go to Space/Shift, mids to A/S/D and highs to D/F/S.
- Recent lanes are penalised, and a quick succession avoids the finger just used.
- Chords never share a finger. Output is deterministic per song and difficulty and regenerates when the finger mapping changes.

Playback (`hooks/useSongPlayer.ts`) uses the AudioContext clock. Engine time is `LEAD_IN + heard position − audio offset`, corrected for `outputLatency` and `baseLatency`. Pause stops the source, and resume schedules a new one from the same position without rewinding the engine. A song run ends 1.2 seconds after its last note. If audio cannot start, the run falls back to the page clock and shows a notice.

In song mode, the left panel shows Difficulty instead of Challenge, song facts, volume and audio offset (±200 ms, persisted with difficulty and the last song in `dextra-settings`). Static is disabled. Library song cards offer ½×, 2× and ±0.5 BPM adjustments, which re-align the phase from the stored envelope, plus Reset, Reload and a two-step Delete. Song results record `songId` and `difficulty`, and Again reloads the song. The last song reopens on the next visit.

Browser check: a synthetic 124 BPM, 40 s WAV imported in about 0.4 s and was detected at 124 BPM. Easy, Normal and Hard produced 73, 137 and 160 notes. A full scripted run scored S at 137/137 with a mean offset of +6 ms. Pause, resume, Again, retune and reset, invalid and undecodable files, restore after reload, and a 390px drawer without overflow were also checked. Limits: songs with tempo changes or free rhythm produce weaker charts, and there is no chart editor or tap calibration yet.

Review fixes: library difficulty buttons are disabled during a run, and every difficulty change returns the trainer to idle. Before, a change while paused rebuilt the trainer with no active run, and Resume froze the stage. `useSongPlayer.play` now resolves `started`, `cancelled` or `failed`. The trainer ignores a start that resolves after its effect was cleaned up, so a quick pause and resume no longer swaps the audio clock for the page clock.

## Hanon sequences (2026-09-22)

Library now groups **Hanon**, **Plans** and **My songs** into separate views.
Hanon contains the reference site's 18 six-lane studies (01–16, 18–19); its
numeric patterns and provenance are documented in `features/hanon/SOURCES.md`.

- Preview ascending and descending phrases with the current key bindings and colors.
- Add, remove and reorder studies, including duplicates; reset to the starter routine.
- Choose 1–16 repetitions per direction, quarter/eighth/sixteenth notes, and both,
  ascending-only or descending-only traversal. Up to 24 queue entries are supported.
- Load into Falling (20–240 BPM) or Static. Musical traversal and chart scroll
  direction are independent. The stage shows the current study, direction and repeat.
- Loaded sequences and tempo persist in `dextra-settings`; unavailable storage remains
  optional. Result snapshots restore the original sequence with Again. Progress
  compares only matching Hanon configurations, rather than mixing unrelated routines.
- Existing key sounds, remapping, judgement windows, pause/resume and fullscreen
  remain shared. The source's 3D stage and pitched background accompaniment are
  not included; these are lane exercises rendered in DEXTRA's own visual language.

`engine/hanon.ts` owns the catalog, validation, counts and sequence generation.
The composer and phase display live in `features/hanon/`, with a dedicated CSS
Module. Both trainers reuse the existing scoring/state engines. TypeScript allows
explicit `.ts` imports so the engine's internal imports also work in native Node tests.

Validation: lint, TypeScript, 29 Node tests and production build passed. Browser
checks covered full Falling (8/8, S) and Static (32/32, 100%) runs, retry, queue
reordering/removal/reset, empty-queue protection, persisted tempo/configuration,
Escape/focus restoration, 320/390/820/1440px widths, 200% CSS zoom, reduced motion,
and simulated touch browsing/loading. Real-device touch scoring is not supported;
scored practice continues to require a physical keyboard.

## Configuration records and personal bests (2026-09-22)

History is implemented in `features/history/HistoryPanel.tsx`, with pure rating,
comparison and filtering logic in `engine/records.ts`. The header opens all records;
the guide's Configuration history shortcut opens records matching the current setup.
Filters include format, fixed/timed/survival session, exercise/song, exact configuration
and records without configuration data. Configuration choices follow the active
format, session and exercise filters. Rating sorting is enabled only for one configuration; mixed
configurations retain chronological sorting. Equal ratings share a personal best.
The record list is windowed with measured variable-height rows, so large histories
keep only the visible records and a small overscan buffer mounted.

Rating policy v1 (higher is better; final values round to two decimals):

- Fixed Falling and songs: the existing accuracy percentage. Arcade points/rank
  are retained in the result details and do not decide the personal best.
- Static fixed: completed groups × 60 / active seconds × (accuracy / 100)².
- Static timed random: completed groups × 60 / selected time limit × (accuracy / 100)².
  Units are `eff/min` (accuracy-adjusted groups per minute).
- Falling survival: survival seconds × (accuracy / 100)², in `eff s`.
  Active times exclude pause time; falling times also exclude the lead-in.

Each completed run saves an ID and configuration snapshot: exercise,
format, challenge, direction, key/finger mapping, relevant BPM and timing windows,
time limit/lives, Hanon sequence settings, or song ID/difficulty/grid/calibration
and generated-chart fingerprint. Static ignores BPM, judgement windows and Hanon
note division because they do not affect stationary practice. Fixed charts ignore
the unused time/life limit. Cosmetic settings and scroll speed are excluded.
Random runs compare generation settings rather than identical random notes.

The guide, history badges and result screen share this definition of comparable.
Results distinguish first benchmark, new personal best, tied best and lower scores;
an earlier milestone that was subsequently beaten is identified as such. Again
restores recorded key/finger assignments and song calibration/grid settings as
well as existing exercise settings. Reviewing history during a paused run offers
an explicit End & retry action.

Older records remain available with computed ratings when enough timing data
exists. Without a full configuration snapshot they are marked Configuration unavailable, excluded
from configuration bests, and never assigned guessed settings. Invalid configuration
snapshots are discarded while retaining the otherwise valid historical result.

Validation: 40 engine tests, TypeScript, lint and production build. Isolated browser
checks covered filter intersections, separate 60/120 BPM bests, sorting, legacy
records, a real Static completion/new-best/retry flow, pause-time exclusion,
configuration snapshots, and history/results at 320–1440px without overflow.
