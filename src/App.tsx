import { useEffect, useState } from 'react'
import SheetFrame, { TitleBlock } from './components/SheetFrame'
import Masthead from './components/Masthead'
import Rail, { type Mode } from './components/Rail'
import SpeedReveal from './components/SpeedReveal'
import Readout from './components/Readout'
import Footer from './components/Footer'
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
  const [mode, setMode] = useState<Mode>('reveal')
  const [busy, setBusy] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [raw, setRaw] = useState('')
  const [card, setCard] = useState<ActionCard | null>(null)
  const [telemetry, setTelemetry] = useState<Telemetry>(EMPTY_TELEMETRY)
  const [ticks, setTicks] = useState<TokenTick[]>([])
  const [error, setError] = useState<string | null>(null)
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [cfg, setCfg] = useState<{ model: string; hasKey: boolean }>({ model: 'gemma-4-31b', hasKey: true })

  useEffect(() => {
    getConfig().then((c) => setCfg({ model: c.model, hasKey: c.hasKey }))
  }, [])

  const reset = () => {
    setCard(null)
    setRaw('')
    setTicks([])
    setTelemetry(EMPTY_TELEMETRY)
    setError(null)
  }

  const handleImage = async (value: string) => {
    setError(null)
    try {
      const dataUrl = await toDataUrl(value)
      setImage(dataUrl)
      reset()
      setHasRun(false)
    } catch {
      setError('Could not load that image.')
    }
  }

  const run = async () => {
    if (!image || busy) return
    setBusy(true)
    setHasRun(true)
    reset()
    setRunStartedAt(performance.now())
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
        setError('Model responded but the card JSON could not be parsed. Raw output is shown.')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetFrame>
      <Masthead model={cfg.model} hasKey={cfg.hasKey} telemetry={telemetry} busy={busy} />

      <div className="section-rule">OPERATIONS · drop a screen → prescribe the fix</div>

      <div className="body-grid">
        <Rail
          image={image}
          busy={busy}
          note={note}
          mode={mode}
          model={cfg.model}
          hasKey={cfg.hasKey}
          samples={SAMPLES}
          onImage={handleImage}
          onNote={setNote}
          onRun={run}
          onClear={() => {
            setImage(null)
            setHasRun(false)
            reset()
          }}
          onMode={setMode}
        />

        <div className="center">
          <SpeedReveal
            ticks={ticks}
            telemetry={telemetry}
            busy={busy}
            liveText={raw}
            hasRun={hasRun}
            mode={mode}
            runStartedAt={runStartedAt}
          />
        </div>

        <div className="readout">
          <Readout card={card} raw={raw} busy={busy} hasRun={hasRun} />
          {error && <div className="err">⚠ {error}</div>}
        </div>
      </div>

      <div className="section-rule">SYSTEM</div>
      <Footer ticks={ticks} telemetry={telemetry} />

      <TitleBlock model={cfg.model} hasKey={cfg.hasKey} />

      <div className="colophon">
        GlassGrid · Cerebras × Gemma 4 · real telemetry measured from the live SSE stream ·{' '}
        <a
          href="https://www.cerebras.ai/blog/gemma-4-on-cerebras-the-fastest-inference-is-now-multimodal"
          target="_blank"
          rel="noreferrer"
        >
          the speed thesis
        </a>
      </div>
    </SheetFrame>
  )
}
