// Small shared number formatting used across the telemetry surfaces.
export function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

// Seconds with two decimals, for the dual elapsed clocks (e.g. "1.42s").
export function secs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '0.00'
  return (ms / 1000).toFixed(2)
}
