import type { ActionCard, AnalysisResult, TokenTick, Telemetry } from './types'

export interface AnalyzeCallbacks {
  onToken?: (fullText: string, tick: TokenTick) => void
  onTelemetry?: (t: Telemetry) => void
}

// Strip code fences / leading prose and parse the strict JSON card defensively.
// Gemma 4 is strong at structured output but a stream may end mid-token, so we
// tolerate trailing junk by extracting the outermost {...} block.
export function parseCard(raw: string): ActionCard | null {
  if (!raw) return null
  let s = raw.trim()
  // Drop ```json ... ``` fences if the model added them.
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const slice = s.slice(start, end + 1)
  try {
    const obj = JSON.parse(slice)
    if (!obj || typeof obj !== 'object') return null
    if (typeof obj.detect !== 'string' || !obj.score) return null
    const sev = obj.score.severity
    const validSev = ['low', 'medium', 'high', 'critical'].includes(sev) ? sev : 'medium'
    return {
      detect: String(obj.detect),
      score: {
        severity: validSev,
        confidence: clamp01(Number(obj.score.confidence)),
      },
      recommend: String(obj.recommend ?? ''),
      act: String(obj.act ?? ''),
      evidence: obj.evidence ? String(obj.evidence) : undefined,
    }
  } catch {
    return null
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}

// Stream an analysis from the proxy, measuring REAL ttft + tok/s as tokens land.
export async function analyzeImage(
  image: string,
  note: string,
  cb: AnalyzeCallbacks = {},
): Promise<AnalysisResult> {
  const started = performance.now()
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, note }),
  })

  if (!res.ok || !res.body) {
    let msg = `Server returned ${res.status}`
    try {
      const j = await res.json()
      msg = j.error || msg
      if (j.detail) msg += ` — ${j.detail}`
    } catch {
      /* keep default */
    }
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let raw = ''
  const ticks: TokenTick[] = []
  let ttftMs: number | null = null
  let completionTokens: number | null = null
  let firstTokenAt: number | null = null
  let lastTokenAt = started

  const emitTelemetry = () => {
    const totalMs = performance.now() - started
    const genWindow = firstTokenAt != null ? lastTokenAt - firstTokenAt : 0
    // tok/s over the generation window (excludes the prefill/TTFT wait).
    let tokensPerSec: number | null = null
    if (completionTokens != null && genWindow > 0) {
      tokensPerSec = (completionTokens / genWindow) * 1000
    } else if (ticks.length > 1 && genWindow > 0) {
      tokensPerSec = ((ticks.length - 1) / genWindow) * 1000
    }
    const t: Telemetry = { ttftMs, totalMs, completionTokens, tokensPerSec }
    cb.onTelemetry?.(t)
    return t
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by blank lines; lines start with "data: ".
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let json: any
      try {
        json = JSON.parse(payload)
      } catch {
        continue
      }
      if (json.error) throw new Error(typeof json.error === 'string' ? json.error : 'stream error')

      // Final usage chunk (stream_options.include_usage) has no choices content.
      if (json.usage?.completion_tokens != null) {
        completionTokens = json.usage.completion_tokens
      }

      const delta: string | undefined = json.choices?.[0]?.delta?.content
      if (delta) {
        const now = performance.now()
        if (ttftMs === null) {
          ttftMs = now - started
          firstTokenAt = now
        }
        lastTokenAt = now
        raw += delta
        const tick: TokenTick = { text: delta, t: now - started }
        ticks.push(tick)
        cb.onToken?.(raw, tick)
        emitTelemetry()
      }
    }
  }

  const telemetry = emitTelemetry()
  return { raw, card: parseCard(raw), ticks, telemetry }
}

export async function getConfig(): Promise<{ model: string; hasKey: boolean; baseUrl: string }> {
  try {
    const r = await fetch('/api/config')
    return await r.json()
  } catch {
    return { model: 'gemma-4-31b', hasKey: false, baseUrl: '' }
  }
}
