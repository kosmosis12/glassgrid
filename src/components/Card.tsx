import type { ActionCard, Severity } from '../lib/types'

interface Props {
  card: ActionCard | null
  raw: string
  streaming: boolean
  hasRun: boolean
}

const SEV_COLOR: Record<Severity, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
}

export default function Card({ card, raw, streaming, hasRun }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span><span className="dot" />Action card · detect → score → recommend → act</span>
        <span>GEMMA 4</span>
      </div>

      {!hasRun && (
        <div className="empty-state">
          drop an image, hit ANALYZE,{'\n'}and Gemma 4 returns a prescriptive card.{'\n\n'}
          detect · score · recommend · act
        </div>
      )}

      {/* While streaming and before the JSON parses, show the raw token stream. */}
      {hasRun && !card && (
        <div className="card">
          <div className="stream-raw">
            {raw}
            {streaming && <span className="cursor" />}
          </div>
        </div>
      )}

      {card && (
        <div className="card">
          <div
            className="sev-banner"
            style={{ ['--sev' as any]: SEV_COLOR[card.score.severity] }}
          >
            <span className="sev-label">{card.score.severity}</span>
            <span className="conf">
              confidence <b>{Math.round(card.score.confidence * 100)}%</b>
            </span>
          </div>

          <div className="step">
            <div className="step-tag">Detect</div>
            <div className="step-body">{card.detect}</div>
          </div>
          <div className="step">
            <div className="step-tag">Recommend</div>
            <div className="step-body">{card.recommend}</div>
          </div>
          <div className="step act">
            <div className="step-tag">Act</div>
            <div className="step-body">{card.act}</div>
          </div>

          {card.evidence && <div className="evidence">evidence · {card.evidence}</div>}
        </div>
      )}
    </div>
  )
}
