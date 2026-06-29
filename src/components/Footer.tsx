import { useMemo } from 'react'
import type { TokenTick, Telemetry } from '../lib/types'
import { fmt } from '../lib/format'

interface Props {
  ticks: TokenTick[]
  telemetry: Telemetry
}

const ARCH = [
  { lab: 'IMAGE', sub: 'png · jpeg' },
  { lab: 'PROXY', sub: 'key server-side', accent: true },
  { lab: 'CEREBRAS', sub: '/v1 · sse' },
  { lab: 'GEMMA 4', sub: 'multimodal', accent: true },
  { lab: 'DSRA CARD', sub: 'strict json' },
]

const SLOW_TPS = 100

// Footer: architecture flow strip + a live telemetry chart. The chart plots the
// cumulative real token rate climbing to the measured tok/s, against the flat
// ~100 tok/s throttled baseline — a visual of the same delta the A/B shows.
export default function Footer({ ticks, telemetry }: Props) {
  const W = 320
  const H = 120

  const { fastPath, peak } = useMemo(() => {
    if (ticks.length < 2) return { fastPath: '', peak: telemetry.tokensPerSec ?? 0 }
    const first = ticks[0].t
    const pts = ticks.map((t, i) => {
      const el = Math.max(t.t - first, 1)
      return { x: t.t - first, y: ((i + 1) / el) * 1000 } // cumulative tok/s
    })
    const maxX = pts[pts.length - 1].x || 1
    const maxY = Math.max(...pts.map((p) => p.y), telemetry.tokensPerSec ?? 0, SLOW_TPS) || 1
    const path = pts
      .map((p) => `${((p.x / maxX) * W).toFixed(1)},${(H - (p.y / maxY) * H).toFixed(1)}`)
      .join(' ')
    return { fastPath: path, peak: maxY }
  }, [ticks, telemetry])

  const slowY = peak > 0 ? H - (SLOW_TPS / peak) * H : H

  return (
    <div className="footer-grid">
      {/* architecture flow */}
      <div className="arch">
        <div className="block-h">
          <span><span className="idx">F</span> · ARCHITECTURE</span>
          <span>THIN CLIENT · NO GPU</span>
        </div>
        <div className="arch-flow">
          {ARCH.map((n, i) => (
            <span key={n.lab} style={{ display: 'contents' }}>
              <div className={`arch-node${n.accent ? ' accent' : ''}`}>
                <div className="lab">{n.lab}</div>
                <div className="sub">{n.sub}</div>
              </div>
              {i < ARCH.length - 1 && <span className="arch-conn">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* live telemetry chart */}
      <div className="chart">
        <div className="block-h">
          <span><span className="idx">G</span> · TELEMETRY</span>
          <span>{fmt(telemetry.tokensPerSec)} tok/s peak</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {/* baseline grid */}
          <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="var(--line-soft)" strokeWidth="1" />
          {/* throttled baseline */}
          <line x1="0" y1={slowY} x2={W} y2={slowY} stroke="var(--sev-high)" strokeWidth="1.5" strokeDasharray="5 4" />
          {/* real rate curve */}
          {fastPath && <polyline points={fastPath} fill="none" stroke="var(--teal)" strokeWidth="2" />}
          {!fastPath && (
            <text className="axis" x={W / 2} y={H / 2} textAnchor="middle">run an analysis to plot the stream</text>
          )}
        </svg>
        <div className="legend">
          <span><i style={{ borderColor: 'var(--teal)' }} />Cerebras rate</span>
          <span><i style={{ borderColor: 'var(--sev-high)' }} />~{SLOW_TPS} tok/s baseline</span>
        </div>
      </div>
    </div>
  )
}
