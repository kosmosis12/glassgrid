import { useCallback, useEffect, useRef, useState } from 'react'
import type { TokenTick, Telemetry } from '../lib/types'

interface Props {
  ticks: TokenTick[]
  telemetry: Telemetry
}

// The Haiku-equivalent baseline we throttle the B-side to. Cerebras publishes
// Gemma 4 at ~1500 tok/s vs ~100 tok/s for Haiku-class inference.
const SLOW_TPS = 100

interface Side {
  text: string
  revealed: number
  rate: number
  done: boolean
}

const EMPTY: Side = { text: '', revealed: 0, rate: 0, done: false }

export default function SpeedReveal({ ticks, telemetry }: Props) {
  const [open, setOpen] = useState(false)
  const [fast, setFast] = useState<Side>(EMPTY)
  const [slow, setSlow] = useState<Side>(EMPTY)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef<number | null>(null)

  const fullText = ticks.map((t) => t.text).join('')
  const tokenCount = telemetry.completionTokens ?? ticks.length
  const realTps = telemetry.tokensPerSec ?? 0

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const run = useCallback(() => {
    if (!ticks.length) return
    stop()
    setFast(EMPTY)
    setSlow(EMPTY)
    setPlaying(true)

    const first = ticks[0].t
    const last = ticks[ticks.length - 1].t
    const fastWindow = Math.max(last - first, 1) // real generation window (ms)
    const slowWindow = (tokenCount / SLOW_TPS) * 1000 // throttled to 100 tok/s
    const scale = slowWindow / fastWindow

    // Schedule each chunk: fast at its real offset, slow stretched to 100 tok/s.
    const fastSched = ticks.map((t) => t.t - first)
    const slowSched = ticks.map((t) => (t.t - first) * scale)

    const start = performance.now()
    const tick = () => {
      const elapsed = performance.now() - start

      let fi = 0
      while (fi < fastSched.length && fastSched[fi] <= elapsed) fi++
      let si = 0
      while (si < slowSched.length && slowSched[si] <= elapsed) si++

      const fSecs = Math.max(elapsed, 1) / 1000
      const sSecs = fSecs
      const fastDone = fi >= ticks.length
      const slowDone = si >= ticks.length

      setFast({
        text: ticks.slice(0, fi).map((t) => t.text).join(''),
        revealed: fi,
        rate: fastDone ? realTps : fi / fSecs,
        done: fastDone,
      })
      setSlow({
        text: ticks.slice(0, si).map((t) => t.text).join(''),
        revealed: si,
        rate: slowDone ? SLOW_TPS : si / sSecs,
        done: slowDone,
      })

      if (!slowDone) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Lock in the headline numbers at the end.
        setFast((s) => ({ ...s, text: fullText, revealed: ticks.length, rate: realTps, done: true }))
        setSlow((s) => ({ ...s, text: fullText, revealed: ticks.length, rate: SLOW_TPS, done: true }))
        setPlaying(false)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [ticks, tokenCount, realTps, fullText, stop])

  useEffect(() => stop, [stop])

  const speedup = realTps > 0 ? realTps / SLOW_TPS : 0

  return (
    <>
      <div className="reveal-bar">
        <div className="reveal-copy">
          <h4>Speed Reveal · why wafer-scale changes what's buildable</h4>
          <p>
            Replay the exact same response at <b>Cerebras Gemma 4 speed</b> vs a throttled{' '}
            <b>~100 tok/s Haiku-equivalent</b>. The agentic loop only feels real on the left.
          </p>
        </div>
        <button
          className="reveal-btn"
          disabled={!ticks.length}
          onClick={() => {
            const next = !open
            setOpen(next)
            if (next) setTimeout(run, 50)
            else {
              stop()
              setPlaying(false)
            }
          }}
        >
          {open ? (playing ? 'REPLAYING…' : 'RERUN A/B ↻') : 'RUN SPEED REVEAL ▸'}
        </button>
      </div>

      {open && (
        <div className="ab-grid">
          <div className="ab-col fast">
            <div className="ab-head">
              <span className="name">
                Cerebras Gemma 4 {fast.done && <span className="badge-win">{speedup ? `${speedup.toFixed(0)}× faster` : 'WAFER-SCALE'}</span>}
              </span>
              <span className="rate"><b>{Math.round(fast.rate)}</b> tok/s</span>
            </div>
            <div className="ab-stream">{fast.text}{!fast.done && <span className="cursor" />}</div>
            <div className="ab-foot">
              <span>{fast.revealed}/{ticks.length} chunks</span>
              <span className={fast.done ? 'done' : ''}>{fast.done ? '✓ complete' : 'streaming…'}</span>
            </div>
          </div>

          <div className="ab-col slow">
            <div className="ab-head">
              <span className="name">Haiku-equivalent · throttled</span>
              <span className="rate"><b>{Math.round(slow.rate)}</b> tok/s</span>
            </div>
            <div className="ab-stream">{slow.text}{!slow.done && <span className="cursor" />}</div>
            <div className="ab-foot">
              <span>{slow.revealed}/{ticks.length} chunks</span>
              <span className={slow.done ? 'done' : ''}>{slow.done ? '✓ complete' : 'still going…'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
