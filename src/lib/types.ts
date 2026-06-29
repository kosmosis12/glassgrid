export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface ActionCard {
  detect: string
  score: { severity: Severity; confidence: number }
  recommend: string
  act: string
  evidence?: string
}

// A streamed token plus the ms offset (from request start) at which it arrived.
// This is the raw material for both the live telemetry and the Speed Reveal replay.
export interface TokenTick {
  text: string
  t: number
}

export interface Telemetry {
  ttftMs: number | null // time to first token
  totalMs: number | null // request start → stream end
  completionTokens: number | null // exact, from Cerebras usage
  tokensPerSec: number | null // measured over the generation window
}

export interface AnalysisResult {
  raw: string
  card: ActionCard | null
  ticks: TokenTick[]
  telemetry: Telemetry
}
