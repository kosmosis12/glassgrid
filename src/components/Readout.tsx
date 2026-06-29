import type { ActionCard, Severity } from '../lib/types'

interface Props {
  card: ActionCard | null
  raw: string
  busy: boolean
  hasRun: boolean
}

const SEV_COLOR: Record<Severity, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
}

// DETECT → SCORE → RECOMMEND → ACT readout, rendered from the real parsed card.
export default function Readout({ card, raw, busy, hasRun }: Props) {
  return (
    <div className="dsra">
      <div className="dsra-h">
        <span><span className="idx">E</span> · READOUT — D · S · R · A</span>
      </div>
      <div className="dsra-body">
        {!hasRun && (
          <div className="dsra-empty">
            run an analysis and Gemma 4{'\n'}returns a prescriptive card.{'\n\n'}
            detect · score · recommend · act
          </div>
        )}

        {hasRun && !card && (
          <div className="dsra-raw">
            {raw}
            {busy && <span className="cursor" />}
          </div>
        )}

        {card && (
          <>
            <div className="sev-banner" style={{ ['--sev' as string]: SEV_COLOR[card.score.severity] } as React.CSSProperties}>
              <span className="lbl">{card.score.severity}</span>
              <span className="conf">confidence <b>{Math.round(card.score.confidence * 100)}%</b></span>
            </div>

            <div className="dsra-step">
              <div className="t">Detect</div>
              <div className="b">{card.detect}</div>
            </div>
            <div className="dsra-step">
              <div className="t">Recommend</div>
              <div className="b">{card.recommend}</div>
            </div>
            <div className="dsra-step act">
              <div className="t">Act</div>
              <div className="b">{card.act}</div>
            </div>

            {card.evidence && <div className="dsra-evidence">evidence · {card.evidence}</div>}
          </>
        )}
      </div>
    </div>
  )
}
