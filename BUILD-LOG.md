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

_(appended as each commit lands, below)_
