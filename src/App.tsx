import { useEffect, useState } from 'react'
import Dropzone from './components/Dropzone'
import TelemetryStrip from './components/Telemetry'
import Card from './components/Card'
import SpeedReveal from './components/SpeedReveal'
import { analyzeImage, getConfig } from './lib/api'
import type { ActionCard, Telemetry, TokenTick } from './lib/types'

const EMPTY_TELEMETRY: Telemetry = {
  ttftMs: null,
  totalMs: null,
  completionTokens: null,
  tokensPerSec: null,
}

const SAMPLES = [
  { name: 'Fleet telemetry — a moving truck at 0% fuel', src: '/samples/fleet.png' },
  { name: 'API gateway — p99 latency breaching SLO', src: '/samples/latency.png' },
  { name: 'Growth dashboard — conversion collapse', src: '/samples/revenue.png' },
]

// Fetch a sample (served from /public) and turn it into a base64 data URL the
// proxy will accept — keeps the demo instant without the user finding an image.
async function toDataUrl(pathOrData: string): Promise<string> {
  if (pathOrData.startsWith('data:')) return pathOrData
  const res = await fetch(pathOrData)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export default function App() {
  const [image, setImage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [raw, setRaw] = useState('')
  const [card, setCard] = useState<ActionCard | null>(null)
  const [telemetry, setTelemetry] = useState<Telemetry>(EMPTY_TELEMETRY)
  const [ticks, setTicks] = useState<TokenTick[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cfg, setCfg] = useState<{ model: string; hasKey: boolean }>({ model: 'gemma-4-31b', hasKey: true })

  useEffect(() => {
    getConfig().then((c) => setCfg({ model: c.model, hasKey: c.hasKey }))
  }, [])

  const handleImage = async (value: string) => {
    setError(null)
    try {
      const dataUrl = await toDataUrl(value)
      setImage(dataUrl)
      // Reset previous analysis when a new image lands.
      setCard(null)
      setRaw('')
      setTicks([])
      setTelemetry(EMPTY_TELEMETRY)
      setHasRun(false)
    } catch {
      setError('Could not load that image.')
    }
  }

  const run = async () => {
    if (!image || busy) return
    setBusy(true)
    setHasRun(true)
    setError(null)
    setCard(null)
    setRaw('')
    setTicks([])
    setTelemetry(EMPTY_TELEMETRY)
    try {
      const result = await analyzeImage(image, note, {
        onToken: (full) => setRaw(full),
        onTelemetry: (t) => setTelemetry(t),
      })
      setRaw(result.raw)
      setCard(result.card)
      setTicks(result.ticks)
      setTelemetry(result.telemetry)
      if (!result.card) {
        setError('Model responded but the card JSON could not be parsed. Raw output is shown above.')
      }
    } catch (e: any) {
      setError(e?.message || 'Analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
            <path d="M50 14 L86 35 L86 65 L50 86 L14 65 L14 35 Z" />
            <path d="M50 14 L50 50 L86 35 M50 50 L14 35 M50 50 L50 86" strokeWidth="3" opacity="0.55" />
          </svg>
          <div>
            <div className="brand-title">Glass<span>Grid</span></div>
            <div className="brand-sub">visual ops agent · cerebras gemma 4</div>
          </div>
        </div>
        <div className={`status-chip${cfg.hasKey ? '' : ' warn'}`}>
          {cfg.hasKey ? (
            <>model <b>{cfg.model}</b> · key loaded ✓</>
          ) : (
            <>⚠ no CEREBRAS_API_KEY — add it to .env</>
          )}
        </div>
      </div>

      <div className="tagline">
        See a dashboard → <b>detect · score · recommend · act</b> → at ~1500 tok/s. The speed is the product.
      </div>

      <div className="grid">
        <Dropzone
          image={image}
          busy={busy}
          note={note}
          samples={SAMPLES}
          onImage={handleImage}
          onNote={setNote}
          onRun={run}
          onClear={() => {
            setImage(null)
            setHasRun(false)
            setCard(null)
            setRaw('')
            setTicks([])
            setTelemetry(EMPTY_TELEMETRY)
            setError(null)
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TelemetryStrip telemetry={telemetry} live={busy} />
          <Card card={card} raw={raw} streaming={busy} hasRun={hasRun} />
        </div>
      </div>

      {error && <div className="err">⚠ {error}</div>}

      <SpeedReveal ticks={ticks} telemetry={telemetry} />

      <div className="footer">
        GlassGrid · built for the Cerebras × Google DeepMind Gemma 4 hackathon ·{' '}
        real telemetry, measured from the live SSE stream ·{' '}
        <a href="https://www.cerebras.ai/blog/gemma-4-on-cerebras-the-fastest-inference-is-now-multimodal" target="_blank" rel="noreferrer">
          the speed thesis
        </a>
      </div>
    </div>
  )
}
