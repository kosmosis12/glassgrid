# GlassGrid — Schematic UI Overhaul · BUILD-LOG

Branch: `feat/schematic-ui` · started 2026-06-29

---

## ⚠ BLOCKER (documented, did NOT halt — see working method)

**`design-spec/glassgrid-schematic.html` and `design-spec/7232.png` do not exist.**
Searched the entire filesystem (`find /`), all git branches, and full git history —
the `design-spec/` directory was never committed and is not present on disk. The task
named these as THE design source of truth, so I cannot pixel-diff against them.

**What I did instead (per "If something blocks you hard … DON'T halt"):** I built the
overhaul from the *highly detailed textual spec embedded in the task prompt itself*,
which enumerates every design token, font, section, and interaction:

- **Color tokens:** navy ink `#15202B`, burnt-amber `#D5762A`, teal `#157A6E`,
  drafting-blue `#2B5C8A`, violet `#5B4B8A`, warm paper `#EFEBE0`.
- **Type:** Space Grotesk (display) + JetBrains Mono (data), via Google Fonts.
- **Texture:** engineering-paper grid background, paper-grain, TUI/bracket frame corners,
  hard offset shadows, ✦ satellite glyph in the wordmark.
- **Layout:** blueprint title-block frame (A1 sheet marker, bracket corners) → masthead
  (engine card + PERCEIVE→REASON→PRESCRIBE→ACT flow + THROUGHPUT TELEMETRY) → 3-column
  body (INPUT/MODE/PROVIDER rail · dual-dashboard SPEED REVEAL · DETECT→SCORE→RECOMMEND→ACT
  readout) → footer (architecture flow strip + live telemetry chart). <1100px → single column.

**RECOMMENDED FIX for the user:** drop the real `design-spec/` files into the repo and I
(or you) can pixel-diff and nudge spacing/exact ornament placement. Every *named* token,
font, section, and wired interaction from the prompt is implemented; only details that exist
*solely* in the unseen mockup (exact pixel offsets, ornament micro-placement) are my faithful
best-interpretation. These are marked `// TODO(review):` in code.

**Data layer untouched:** the Cerebras proxy (`server/index.js`), key handling, SSE parsing
(`src/lib/api.ts`), and the DSRA prompt are verified-working and were NOT modified — this is a
presentation-layer reskin only.

---

## Plan (commit-by-commit)

1. Foundation — Google Fonts, `src/styles/tokens.css` (design tokens), engineering-paper
   grid + paper-grain base, retire the old dark theme.
2. `SheetFrame` — blueprint title-block frame, bracket corners, A1 sheet marker.
3. `Masthead` — engine card (✦ wordmark + model id) + PERCEIVE→REASON→PRESCRIBE→ACT flow
   + THROUGHPUT TELEMETRY block (real tok/s, TTFT).
4. Left rail — INPUT (dropzone), MODE (single / speed-reveal), PROVIDER (Cerebras + model,
   RUN ANALYSIS button).
5. Center — dual-dashboard SPEED REVEAL with real dual elapsed clocks + measured rates.
6. Right — DETECT→SCORE→RECOMMEND→ACT readout from the real parsed card JSON.
7. Footer — architecture flow strip + live telemetry chart.
8. Responsive fallback + polish; build + dev-boot verification; README note.

## Run it

```bash
cp .env.example .env   # add CEREBRAS_API_KEY
npm install
npm run dev            # → http://localhost:5173
```

## Changelog (per commit)

1. **`7cf4c87` Schematic UI foundation** — `src/styles/tokens.css` (palette, fonts,
   offset shadows); Google Fonts in `index.html`; `src/index.css` fully replaced:
   warm-paper canvas + 8px/64px engineering grid + fractal paper-grain + all region
   styling (sheet frame, masthead, 3-col body, center, readout, footer, responsive).
   Old dark theme retired. Build ✓.
2. **`25afefa` SheetFrame + Masthead** — `SheetFrame.tsx` (bracket corners, A1 marker,
   sheet id, `TitleBlock`); `Masthead.tsx` (✦ wordmark engine card, cognition flow,
   THROUGHPUT TELEMETRY); `lib/format.ts` shared helpers. Build ✓.
3. **`7289466` Left rail** — `Rail.tsx`: INPUT (drag/drop/clipboard ingest + samples),
   MODE (single / speed-reveal segmented), PROVIDER (rows + note + RUN ANALYSIS).
   Build ✓.
4. **`fed5faa` Integrate 3-column layout** — `SpeedReveal.tsx` rewritten (dual dashboards,
   real dual elapsed clocks, A/B race, computed Nx verdict, auto-run in reveal mode);
   `Readout.tsx` (DSRA from real card); `Footer.tsx` (arch strip + real telemetry chart);
   new `App.tsx` wiring all regions + run/telemetry/ticks/mode state. Removed old
   Dropzone/Card/Telemetry. Fixed wordmark spacing, slow-dash header, readout header.
   Build ✓.
5. _(this commit)_ **Docs** — README "Design" section for the schematic aesthetic;
   this changelog; verification notes below.

## Verification

- `npm run build` (tsc + vite) passes at every commit.
- Dev server boots clean (`npm run dev` → client 200, proxy up, `/api/config` OK).
- Rendered the empty, populated (seeded demo card + telemetry, then reverted), and
  narrow (<1100px single-column) states via headless Chromium and confirmed the layout
  matches the spec: bracket corners, A1 marker, ✦ wordmark, masthead flow, 3-column
  body, severity-colored readout (CRITICAL → red), footer flow + chart.

## TODO(review) / notes

- **No `CEREBRAS_API_KEY` in this environment** — could not screenshot a *live* run
  (placeholder key 401s upstream). The data layer (`server/index.js`, `lib/api.ts`,
  the DSRA prompt) is unchanged and was verified end-to-end in the prior build; the
  populated-state render was confirmed with a temporary seeded card (reverted). Run
  with a real key to see live streaming + the A/B race animate.
- **Missing `design-spec/` (see blocker above)** — exact pixel offsets / ornament
  micro-placement are my faithful best-interpretation of the textual spec. Drop the
  real schematic file in to pixel-diff.
- MODE = SPEED REVEAL auto-runs the A/B race after the live run completes; MODE =
  SINGLE streams once and leaves the throttled side idle (run A/B manually via the
  header button). This was the most faithful reading of "dual elapsed clocks show
  REAL timing (Cerebras stream vs throttled baseline)".
