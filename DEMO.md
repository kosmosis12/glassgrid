# GlassGrid — 60–90s demo script

**Setup (before you record):** `cp .env.example .env`, add your `CEREBRAS_API_KEY`,
run `npm run dev`, open http://localhost:5173. Confirm the header reads
`model gemma-4-31b · key loaded ✓`. Have the **fleet** sample ready.

---

### 0:00 — The hook (10s)

> "This is GlassGrid. It's a visual operations agent running on Cerebras Gemma 4.
> You give it a screen — a dashboard, a chart, any UI — and it tells you what's
> wrong and what to do about it. The whole point is *speed*. Watch."

### 0:10 — Drop the image (10s)

Click the **fleet** sample thumbnail (or drag in your own dashboard). The
screenshot fills the input panel.

> "Here's live fleet telemetry — 28 trucks. Somewhere in this table is the one
> thing an operator needs to act on right now."

Hit **ANALYZE ▸**.

### 0:20 — The card lands, instantly (20s)

The telemetry strip spikes — point at the **big tok/sec number** as it settles
around four figures, and at **time-to-first-token in the low hundreds of ms**.

> "Time to first token — milliseconds. And that big number is the live token rate
> off the actual stream. Nothing here is faked; we're timing the real SSE."

Read the card:

> "DETECT: truck TRK-204 is *moving* but reporting *zero percent fuel*. SCORE:
> critical, high confidence. RECOMMEND: dispatch fuel / reroute. ACT: contact the
> driver now. That's a prescriptive card, not a chatbot paragraph — severity even
> drives the color."

### 0:40 — The Speed Reveal (the money shot, 30s)

Scroll to **Speed Reveal** and hit **RUN SPEED REVEAL ▸**. Two columns replay the
*same* response.

> "Same model, same answer, replayed at two speeds. On the left: Cerebras Gemma 4
> at wafer-scale. On the right: throttled to about 100 tokens a second — roughly
> Haiku-class."

Let it run. The left finishes; the right is still crawling.

> "Left's done. Right is still going. *This* is the thesis: a visual agentic loop —
> see a screen, decide, act, look again — is only usable when the answer comes back
> before you can blink. At a hundred tokens a second it's a waiting room. At fifteen
> hundred it's a reflex."

Point at the **`15× faster` badge** on the left column.

### 1:10 — Close (10s)

> "See the screen, score it, prescribe the fix — at a speed that makes the loop
> real. That's what wafer-scale unlocks. That's GlassGrid."

---

## Backup beats

- **Other samples:** `latency.png` (p99 4210ms, 181% over SLO) and `revenue.png`
  (trial→paid conversion collapse) both produce sharp, different cards.
- **Paste live:** screenshot any real dashboard on your machine and `⌘V` straight
  into the page — no file needed.
- **If a card looks off:** add context in the note field ("EU fleet, night shift")
  and re-run — Gemma 4 uses it.
- **Re-run the A/B:** the Speed Reveal button becomes `RERUN A/B ↻` so you can
  replay the dramatic moment as many times as you like.
