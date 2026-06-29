import type { Telemetry } from '../lib/types'

interface Props {
  telemetry: Telemetry
  live: boolean
}

function fmt(n: number | null, digits = 0): string {
  if (n == null) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

// The hero. Big live tok/s counter + TTFT and total latency. All measured from
// the real Cerebras SSE stream — nothing here is fabricated.
export default function TelemetryStrip({ telemetry, live }: Props) {
  const { tokensPerSec, ttftMs, totalMs, completionTokens } = telemetry
  return (
    <div className="panel">
      <div className="panel-head">
        <span><span className="dot" />Wafer-speed telemetry · live</span>
        <span>CEREBRAS</span>
      </div>
      <div className="telemetry">
        <div className="tps-hero">
          <span className={`tps-num${live ? ' live' : ''}`}>{fmt(tokensPerSec)}</span>
          <span className="tps-unit">tok / sec</span>
        </div>
        <div className="tps-sub">
          <div className="metric">
            <div className="label">Time to first token</div>
            <div className="val">{ttftMs == null ? '—' : fmt(ttftMs)}<small>ms</small></div>
          </div>
          <div className="metric">
            <div className="label">Total latency</div>
            <div className="val">{totalMs == null ? '—' : fmt(totalMs)}<small>ms</small></div>
          </div>
          <div className="metric">
            <div className="label">Completion tokens</div>
            <div className="val">{fmt(completionTokens)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
