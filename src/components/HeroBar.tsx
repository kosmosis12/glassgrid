import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mode } from './Rail'

interface Sample { name: string; src: string }
interface Props {
  image: string | null
  busy: boolean
  note: string
  mode: Mode
  model: string
  hasKey: boolean
  samples: Sample[]
  onImage: (dataUrl: string) => void
  onNote: (v: string) => void
  onRun: () => void
  onClear: () => void
  onMode: (m: Mode) => void
}

const ACCEPT = ['image/png', 'image/jpeg']
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function HeroBar({
  image, busy, note, mode, model, hasKey, samples,
  onImage, onNote, onRun, onClear, onMode,
}: Props) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ingest = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return
      if (!ACCEPT.includes(file.type)) { alert('GlassGrid accepts PNG or JPEG only.'); return }
      onImage(await fileToDataUrl(file))
    }, [onImage],
  )

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
      if (item) ingest(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [ingest])

  return (
    <div className="hero">
      <div className="hero-title"><span className="sat">✦</span> Glass<em>Grid</em></div>
      <div className="hero-stage">
        <div className="hero-scope">
          {!image ? (
            <div
              className={`dropzone${drag ? ' drag' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); ingest(e.dataTransfer.files?.[0]) }}
            >
              <svg className="dz-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <h3>Drop a dashboard</h3>
              <p>drag &amp; drop · click · <span className="kbd">⌘V</span> paste</p>
            </div>
          ) : (
            <div className="preview">
              <img src={image} alt="dashboard to analyze" />
              <div className="preview-actions">
                <button className="mini" onClick={() => inputRef.current?.click()}>Replace</button>
                <button className="mini" onClick={onClear}>Clear</button>
              </div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => ingest(e.target.files?.[0])} />
          {samples.length > 0 && (
            <div className="hero-samples">
              <span className="tag">load a sample</span>
              <div className="sample-row">
                {samples.map((s) => (
                  <div key={s.name} className="sample-thumb" title={s.name} onClick={() => onImage(s.src)}>
                    <img src={s.src} alt={s.name} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hero-command">
          <button className="btn-run-hero" onClick={onRun} disabled={busy || !image}>
            {busy ? 'ANALYZING…' : '▸ RUN ANALYSIS'}
          </button>
          <div className="hero-hint">
            {!image ? 'drop or load a dashboard to begin' : busy ? 'streaming from Cerebras…' : 'ready · press to analyze'}
          </div>
          <input
            className="note-input"
            value={note}
            placeholder="optional context for the model…"
            onChange={(e) => onNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy && image) onRun() }}
          />
          <div className="hero-controls">
            <div className="seg seg-sm">
              <button className={mode === 'single' ? 'on' : ''} onClick={() => onMode('single')}>SINGLE</button>
              <button className={mode === 'reveal' ? 'on' : ''} onClick={() => onMode('reveal')}>SPEED REVEAL</button>
            </div>
            <div className="hero-prov">
              <span className="k">engine&nbsp;</span>
              <span className="v amber">{model}</span>
              <span className={`dot ${hasKey ? 'ok' : 'bad'}`} title={hasKey ? 'key loaded' : 'no key'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
