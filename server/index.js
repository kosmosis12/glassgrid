// GlassGrid proxy — holds the Cerebras key server-side and streams the
// multimodal completion back to the browser as Server-Sent Events.
//
// The browser NEVER sees CEREBRAS_API_KEY. It only ever talks to /api/*.
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 8787
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'gemma-4-31b'
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '')
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'gemma4:12b-it-qat'
const CEREBRAS_BASE_URL = (process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1').replace(/\/$/, '')

const app = express()
// Dashboard screenshots base64-encode large; allow a generous body.
app.use(express.json({ limit: '15mb' }))

// The DETECT → SCORE → RECOMMEND → ACT contract. Gemma 4 reads dashboards well
// but is weak at pixel coordinates, so we ask for SEMANTIC findings only.
const SYSTEM_PROMPT = `You are GlassGrid, a visual operations-intelligence agent. You are shown ONE image: a dashboard, chart, telemetry panel, or application UI.

Identify the SINGLE most operationally significant anomaly, risk, or signal in the image and return a prescriptive action card.

Rules:
- Reason over SEMANTIC content ("fuel at 0% on a moving vehicle", "p99 latency spiked to 4.2s", "error rate crossed the alert threshold"). NEVER output pixel coordinates, bounding boxes, or "draw a box".
- Pick the one finding an operator must act on first. Quote the concrete numbers/labels you see.
- Be decisive and specific. No hedging, no preamble.
- Return STRICT JSON ONLY. No markdown, no code fences, no prose outside the JSON.

JSON schema (return exactly these keys):
{
  "detect": "<one sentence: the single most significant signal, with concrete values from the image>",
  "score": { "severity": "low" | "medium" | "high" | "critical", "confidence": <number 0-1> },
  "recommend": "<one sentence: what should be done about it>",
  "act": "<one short imperative next action an operator can take right now>",
  "evidence": "<the specific values/labels in the image that justify this>"
}`

function buildPayload(imageDataUrl, note, stream) {
  const userContent = [
    {
      type: 'text',
      text:
        (note && note.trim()
          ? `Operator note: ${note.trim()}\n\n`
          : '') +
        'Analyze this image and return the GlassGrid action card as strict JSON.',
    },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ]

  return {
    model: CEREBRAS_MODEL,
    stream,
    // Deterministic-ish so the card is stable across the Speed Reveal A/B.
    temperature: 0.2,
    max_completion_tokens: 700,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    // Ask Cerebras to include token usage in the final stream chunk so the
    // client can compute exact tok/s from real completion_tokens.
    ...(stream ? { stream_options: { include_usage: true } } : {}),
  }
}

// Surface config (model id, whether a key is present) — no secrets leaked.
app.get('/api/config', (_req, res) => {
  res.json({
    model: CEREBRAS_MODEL,
    baseUrl: CEREBRAS_BASE_URL,
    hasKey: Boolean(CEREBRAS_API_KEY),
  })
})


async function streamOllama(image, note, res) {
  const b64 = image.replace(/^data:image\/[a-z]+;base64,/, '')
  const sys = 'You are a visual operations agent. Detect the anomaly in this dashboard, score severity, and emit a JSON action card: {"detect":"","score":"","recommend":"","act":""}.'
  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_VISION_MODEL, stream: true,
      messages: [{ role: 'user', content: (note ? note + '\n\n' : '') + sys, images: [b64] }] }),
  })
  if (!r.ok || !r.body) { res.write(`data: ${JSON.stringify({ error: `Ollama ${r.status}` })}\n\n`); res.end(); return }
  const reader = r.body.getReader(), dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      let j; try { j = JSON.parse(line) } catch { continue }
      const tok = j.message?.content || ''
      if (tok) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: tok } }] })}\n\n`)
      if (j.done) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: j.prompt_eval_count || 0, completion_tokens: j.eval_count || 0 } })}\n\n`)
        res.write('data: [DONE]\n\n')
      }
    }
  }
  res.end()
}

// Streaming analysis. Proxies the Cerebras SSE stream straight through so the
// client measures REAL time-to-first-token and tokens/sec.
app.post('/api/analyze', async (req, res) => {
  if (!CEREBRAS_API_KEY) {
    return res
      .status(500)
      .json({ error: 'CEREBRAS_API_KEY is not set on the server. Copy .env.example to .env and add your key.' })
  }

  const { image, note } = req.body || {}
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Provide a base64 image data URL (PNG or JPEG) in the "image" field.' })
  }

  let upstream
  try {
    upstream = await fetch(`${CEREBRAS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify(buildPayload(image, note, true)),
    })
  } catch (err) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.flushHeaders?.()
    return streamOllama(image, note, res)
  }

  if (!upstream.ok || !upstream.body) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.flushHeaders?.()
    return streamOllama(image, note, res)
  }

  // Pass the SSE stream through verbatim.
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const reader = upstream.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: `stream interrupted: ${err.message}` })}\n\n`)
  } finally {
    res.end()
  }
})

app.listen(PORT, () => {
  console.log(`\n  GlassGrid proxy  →  http://localhost:${PORT}`)
  console.log(`  model: ${CEREBRAS_MODEL}   key: ${CEREBRAS_API_KEY ? 'loaded ✓' : 'MISSING ✗ (add CEREBRAS_API_KEY to .env)'}\n`)
})
