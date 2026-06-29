import { useCallback, useEffect, useRef, useState } from 'react'
import type { TokenTick, Telemetry } from '../lib/types'
import type { Mode } from './Rail'
import { fmt, secs } from '../lib/format'

interface Props {
  ticks: TokenTick[]
  telemetry: Telemetry
  busy: boolean
  liveText: string
  hasRun: boolean
  mode: Mode
  runStartedAt: number | null
}

// Haiku-equivalent baseline we throttle the B-side to (~100 tok/s vs Cerebras ~1500).
const SLOW_TPS = 100

interface Side {
  text: string
  clockMs: number
  rate: number
  done: boolean
}
const EMPTY: Side = { text: '', clockMs: 0, rate: 0, done: false }

export default function SpeedReveal({ ticks, telemetry, busy, liveText, hasRun, mode, runStartedAt }: Props) {
  const [liveClock, setLiveClock] = useState(0)
  const [replaying, setReplaying] = useState(false)
  const [fast, setFast] = useState<Side>(EMPTY)
  const [slow, setSlow] = useState<Side>(EMPTY)
  const rafRef = useRef<number | null>(null)
  const lastTicksRef = useRef<TokenTick[] | null>(null)

  const fullText = ticks.map((t) => t.text).join('')
  const realTps = telemetry.tokensPerSec ?? 0
  const speedup = realTps > 0 ? realTps / SLOW_TPS : 0

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  // Live elapsed clock for the FAST side during the real Cerebras stream.
  useEffect(() => {
    if (!busy || runStartedAt == null) return
    let raf = 0
    const tick = () => {
      setLiveClock(performance.now() - runStartedAt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [busy, runStartedAt])

  // The A/B race: replay the captured stream — fast at its REAL recorded cadence,
  // slow stretched to the throttled 100 tok/s baseline. Both clocks count real time.
  const runReplay = useCallback(() => {
    if (!ticks.length) return
    stop()
    setReplaying(true)
    setFast(EMPTY)
    setSlow(EMPTY)

    const first = ticks[0].t
    const last = ticks[ticks.length - 1].t
    const fastWindow = Math.max(last - first, 1)
    const tokenCount = telemetry.completionTokens ?? ticks.length
    const slowWindow = (tokenCount / SLOW_TPS) * 1000
    const scale = slowWindow / fastWindow
    const fastSched = ticks.map((t) => t.t - first)
    const slowSched = ticks.map((t) => (t.t - first) * scale)
    const join = (n: number) => ticks.slice(0, n).map((t) => t.text).join('')

    const start = performance.now()
    const step = () => {
      const el = performance.now() - start
      let fi = 0
      while (fi < fastSched.length && fastSched[fi] <= el) fi++
      let si = 0
      while (si < slowSched.length && slowSched[si] <= el) si++
      const fDone = fi >= ticks.length
      const sDone = si >= ticks.length
      const elSec = Math.max(el, 1) / 1000

      setFast({ text: join(fi), clockMs: fDone ? fastWindow : el, rate: fDone ? realTps : fi / elSec, done: fDone })
      setSlow({ text: join(si), clockMs: sDone ? slowWindow : el, rate: sDone ? SLOW_TPS : si / elSec, done: sDone })

      if (!sDone) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setFast({ text: fullText, clockMs: fastWindow, rate: realTps, done: true })
        setSlow({ text: fullText, clockMs: slowWindow, rate: SLOW_TPS, done: true })
        setReplaying(false)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [ticks, telemetry, fullText, stop, realTps])

  // Auto-run the A/B once per fresh result when MODE = speed-reveal.
  useEffect(() => {
    if (busy || !hasRun || !ticks.length) return
    if (lastTicksRef.current === ticks) return
    lastTicksRef.current = ticks
    if (mode === 'reveal') runReplay()
  }, [busy, hasRun, ticks, mode, runReplay])

  useEffect(() => stop, [stop])

  // Resolve what each column shows given the current phase.
  const fastView: Side = replaying
    ? fast
    : busy
      ? { text: liveText, clockMs: liveClock, rate: realTps, done: false }
      : hasRun
        ? { text: fullText, clockMs: telemetry.totalMs ?? 0, rate: realTps, done: true }
        : EMPTY

  const slowIdle = !replaying && !slow.done
  const verdictReady = slow.done && !replaying

  return (
    <div className="reveal">
      <div className="reveal-h">
        <span className="title"><span className="idx">D</span> · SPEED REVEAL — DUAL DASHBOARD</span>
        <button className="btn-reveal" disabled={!ticks.length || busy} onClick={runReplay}>
          {replaying ? 'REPLAYING…' : ticks.length ? 'RUN A/B ↻' : 'RUN A/B'}
        </button>
      </div>

      <div className="dash-grid">
        {/* FAST — Cerebras */}
        <div className="dash fast">
          <div className="dash-h">
            <span className="name">Cerebras · {/* model shown in masthead */}Gemma 4</span>
            <span className="rate"><b>{fmt(fastView.rate)}</b> tok/s</span>
          </div>
          <div className="dash-clock">
            {secs(fastView.clockMs)}<small>s</small>
          </div>
          <div className="dash-stream">
            {fastView.text}
            {(busy || replaying) && !fastView.done && <span className="cursor" />}
          </div>
          <div className="dash-foot">
            <span>elapsed · real stream</span>
            <span className={fastView.done ? 'done' : ''}>{fastView.done ? '✓ complete' : busy || replaying ? 'streaming…' : 'idle'}</span>
          </div>
        </div>

        {/* SLOW — throttled baseline */}
        <div className="dash slow">
          <div className="dash-h">
            <span className="name">Haiku-equiv · throttled</span>
            <span className="rate"><b>{fmt(slow.rate)}</b> tok/s</span>
          </div>
          <div className="dash-clock">
            {secs(slow.clockMs)}<small>s</small>
          </div>
          <div className="dash-stream">
            {slowIdle ? (
              <span style={{ color: 'var(--ink-3)' }}>
                {ticks.length ? 'press RUN A/B to race the throttled baseline.' : 'run an analysis, then race the throttled baseline here.'}
              </span>
            ) : (
              <>
                {slow.text}
                {!slow.done && <span className="cursor" />}
              </>
            )}
          </div>
          <div className="dash-foot">
            <span>elapsed · throttled</span>
            <span className={slow.done ? 'done' : ''}>{slow.done ? '✓ complete' : replaying ? 'still going…' : 'idle'}</span>
          </div>
        </div>
      </div>

      {verdictReady && (
        <div className="verdict">
          same response, same tokens — Cerebras finished
          <span className="x">{speedup ? `${speedup.toFixed(0)}×` : '—'}</span>
          faster. that delta is why visual agentic loops are buildable.
        </div>
      )}
    </div>
  )
}
