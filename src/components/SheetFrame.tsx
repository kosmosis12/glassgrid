import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

// The blueprint title-block frame: a drafting sheet with bracket corners, an
// A1 sheet marker, and a sheet id. Wraps the whole application surface.
export default function SheetFrame({ children }: Props) {
  return (
    <div className="sheet-wrap">
      <div className="sheet">
        <span className="sheet-corner tl" />
        <span className="sheet-corner tr" />
        <span className="sheet-corner bl" />
        <span className="sheet-corner br" />
        <span className="sheet-marker">A1</span>
        <span className="sheet-id">SHEET 01 / 01 · GLASSGRID</span>
        {children}
      </div>
    </div>
  )
}

// Architectural title-block strip — placed at the bottom of the sheet.
export function TitleBlock({ model, hasKey }: { model: string; hasKey: boolean }) {
  return (
    <div className="titleblock">
      <div className="tb-cell">
        <div className="k">Project</div>
        <div className="v">GlassGrid · Visual Ops Agent</div>
      </div>
      <div className="tb-cell">
        <div className="k">Engine</div>
        <div className="v amber">{model}</div>
      </div>
      <div className="tb-cell">
        <div className="k">Provider</div>
        <div className="v">Cerebras</div>
      </div>
      <div className="tb-cell">
        <div className="k">Scale</div>
        <div className="v">~1500 tok/s</div>
      </div>
      <div className="tb-cell">
        <div className="k">Status</div>
        <div className="v amber">{hasKey ? 'KEY LOADED' : 'NO KEY'}</div>
      </div>
    </div>
  )
}
