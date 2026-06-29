# GlassGrid

**A real-time visual ops agent on Cerebras Gemma 4.** Drop a dashboard, chart, or
UI screenshot — Gemma 4 *sees* it, reasons over it, and returns a structured
**DETECT → SCORE → RECOMMEND → ACT** card. Alongside the card runs a live
"wafer-speed" telemetry strip — tokens/sec, time-to-first-token, total latency —
measured from the real stream.

> Built for the **Cerebras × Google DeepMind Gemma 4 hackathon.** It demonstrates
> the exact capability Cerebras is showcasing: a model that looks at an operational
> screen and returns a prescriptive action, running at **~1500 tokens/sec** on
> wafer-scale silicon.

---

## The speed thesis

The product *is* the speed. A visual agentic loop — see a screen, decide, act,
look again — is only usable if the decision comes back faster than a human can
glance. At ~100 tok/s (Haiku-class) the loop feels like waiting. At Cerebras'
~1500 tok/s for Gemma 4, it feels instant — and that changes what you can build.

GlassGrid makes this visceral with the **Speed Reveal**: it replays the exact
same model response side by side — full Cerebras throughput vs an artificially
throttled ~100 tok/s baseline — so you *see* why wafer-scale unlocks visual
agentic workflows. ([Cerebras' announcement of Gemma 4 multimodal at 1,500 tok/s](https://www.cerebras.ai/blog/gemma-4-on-cerebras-the-fastest-inference-is-now-multimodal).)

## What it does

1. **Drop / paste an image** — drag-drop, file picker, or paste from clipboard (`⌘V` / `Ctrl+V`).
2. **Stream to Gemma 4** — the image is base64-encoded and sent to Cerebras'
   OpenAI-compatible multimodal endpoint via a tiny server-side proxy.
3. **Get a cockpit card** — the single most operationally significant signal,
   scored for severity + confidence, with a concrete next action. Severity drives
   the color (gold → amber → red).
4. **Watch real telemetry** — tok/s, TTFT, and total latency, measured live from
   the SSE stream. Nothing is faked.
5. **Hit Speed Reveal** — the dramatic A/B that proves the point.

## Why Gemma 4, prompted carefully

Gemma 4 is strong at reading dashboards, documents, and charts (6/7 on the
Roboflow multimodal eval) but **weak at precise pixel coordinates / bounding
boxes.** So GlassGrid's prompt asks only for **semantic** findings —
*"a moving truck reporting 0% fuel"*, *"p99 latency at 4210ms, 181% over SLO"* —
never coordinates or "draw a box." That plays to the model's strengths.

## Architecture

```
browser (React/TS, Vite)
   │  POST /api/analyze  { image: dataURL, note }
   ▼
Node/Express proxy  ── holds CEREBRAS_API_KEY (never shipped to the client)
   │  OpenAI-compatible multimodal chat/completions, stream: true
   ▼
Cerebras Inference  ── model: gemma-4-31b  @ https://api.cerebras.ai/v1
```

- **Thin client.** No GPU, no local model, no Docker. Build and run from anywhere.
- **Key stays server-side.** The browser only ever talks to `/api/*`. The Vite dev
  server proxies `/api` to the Express process.
- **Real streaming telemetry.** The proxy passes the Cerebras SSE stream straight
  through; the client timestamps tokens to compute TTFT and tok/s, and reads exact
  `completion_tokens` from the usage chunk (`stream_options.include_usage`).

### Verified against Cerebras docs

| Thing | Value | Source |
|---|---|---|
| Base URL | `https://api.cerebras.ai/v1` | [OpenAI compatibility](https://inference-docs.cerebras.ai/resources/openai) |
| Model (only one with vision) | `gemma-4-31b` | [Image inputs](https://inference-docs.cerebras.ai/capabilities/image-inputs) |
| Image format | `image_url` content block, `data:image/...;base64,...` | [Image inputs](https://inference-docs.cerebras.ai/capabilities/image-inputs) |
| Limits | ≤5 images, ≤10 MB, PNG/JPEG only | [Image inputs](https://inference-docs.cerebras.ai/capabilities/image-inputs) |

The model id is **read from `CEREBRAS_MODEL` in the environment**, never
hardcoded — if Cerebras renames it at GA, change one line in `.env`.

## Run it (two commands)

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

First, add your key:

```bash
cp .env.example .env
# edit .env and set CEREBRAS_API_KEY (get one at https://cloud.cerebras.ai)
```

`.env`:

```
CEREBRAS_API_KEY=csk-...          # required — stays server-side
CEREBRAS_MODEL=gemma-4-31b        # the multimodal model id
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
PORT=8787                         # the proxy port the client proxies to
```

`npm run dev` starts both the Express proxy and the Vite client together. The app
will tell you in the header if the key is missing.

> No key handy? The header shows a warning and the sample thumbnails still load so
> you can see the UI — but analysis needs a valid `CEREBRAS_API_KEY`.

## Samples

Three ready-made dashboards live in [`public/samples/`](public/samples) so the demo
works instantly — click a thumbnail under the dropzone:

- **`fleet.png`** — fleet telemetry where one *moving* truck reports **0% fuel**.
- **`latency.png`** — an API gateway with **p99 at 4210ms, 181% over SLO**.
- **`revenue.png`** — a growth dashboard with a **trial→paid conversion collapse**.

(They're plain HTML dashboards rendered to PNG — see [`scripts/`](scripts).)

## The card contract

Gemma 4 is prompted to return strict JSON, parsed defensively (code fences
stripped, partial streams tolerated):

```json
{
  "detect":    "One sentence: the single most significant signal, with concrete values.",
  "score":     { "severity": "low|medium|high|critical", "confidence": 0.0-1.0 },
  "recommend": "One sentence: what to do about it.",
  "act":       "One short imperative next action.",
  "evidence":  "The specific values/labels in the image that justify this."
}
```

## Demo

See [`DEMO.md`](DEMO.md) for a 60–90s script.

## License

MIT — see [`LICENSE`](LICENSE).
