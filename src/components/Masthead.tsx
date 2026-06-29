import { Fragment } from 'react'
import type { Telemetry } from '../lib/types'
import { fmt } from '../lib/format'

interface Props {
  model: string
  hasKey: boolean
  telemetry: Telemetry
  busy: boolean
}

const FLOW = [
  { n: '01', name: 'PERCEIVE', desc: 'read the screen' },
  { n: '02', name: 'REASON', desc: 'find the signal' },
  { n: '03', name: 'PRESCRIBE', desc: 'score + recommend' },
  { n: '04', name: 'ACT', desc: 'next action' },
]

// Masthead: engine card · PERCEIVE→REASON→PRESCRIBE→ACT flow · THROUGHPUT block.
export default function Masthead({ model, hasKey, telemetry, busy }: Props) {
  return (
    <div className="masthead">
      {/* engine card */}
      <div className="block engine">
        <div className="block-h">
          <span><span className="idx">00</span> · ENGINE</span>
          <span>MULTIMODAL</span>
        </div>
        <div className="wordmark">
          <span className="sat">✦</span>
          Glass<em>Grid</em>
        </div>
        <div className="subtitle">visual operations agent · sees a dashboard, prescribes the fix</div>
        <div className="chips">
          <span className="chip">model <b>{model}</b></span>
          <span className="chip">Cerebras Gemma 4</span>
          <span className={`chip ${hasKey ? 'ok' : 'warn'}`}>{hasKey ? 'key loaded ✓' : 'no key ✗'}</span>
        </div>
      </div>

      {/* cognition flow */}
      <div className="block">
        <div className="block-h">
          <span><span className="idx">01</span> · COGNITION FLOW</span>
          <span>DSRA</span>
        </div>
        <div className="flow-steps">
          {FLOW.map((s, i) => (
            <Fragment key={s.name}>
              <div className="flow-step">
                <span className="num">{s.n}</span>
                <span className="name">{s.name}</span>
                <span className="desc">{s.desc}</span>
              </div>
              {i < FLOW.length - 1 && <span className="flow-arrow">→</span>}
            </Fragment>
          ))}
        </div>
      </div>

      {/* throughput telemetry — real, measured from the SSE stream */}
      <div className="block throughput">
        <div className="block-h">
          <span><span className="idx">02</span> · THROUGHPUT TELEMETRY</span>
          <span>LIVE</span>
        </div>
        <div className="tps">
          <span className={`n${busy ? ' live' : ''}`}>{fmt(telemetry.tokensPerSec)}</span>
          <span className="u">tok / sec</span>
        </div>
        <div className="subs">
          <div className="metric">
            <div className="k">TTFT</div>
            <div className="v">{telemetry.ttftMs == null ? '—' : fmt(telemetry.ttftMs)}<small>ms</small></div>
          </div>
          <div className="metric">
            <div className="k">Latency</div>
            <div className="v">{telemetry.totalMs == null ? '—' : fmt(telemetry.totalMs)}<small>ms</small></div>
          </div>
          <div className="metric">
            <div className="k">Tokens</div>
            <div className="v">{fmt(telemetry.completionTokens)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
