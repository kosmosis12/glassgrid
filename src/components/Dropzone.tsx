import { useCallback, useEffect, useRef, useState } from 'react'

interface Sample {
  name: string
  src: string
}

interface Props {
  image: string | null
  busy: boolean
  note: string
  samples: Sample[]
  onImage: (dataUrl: string) => void
  onNote: (v: string) => void
  onRun: () => void
  onClear: () => void
}

// PNG/JPEG only and ≤10MB payload per Cerebras image-input limits.
const ACCEPT = ['image/png', 'image/jpeg']

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function Dropzone({
  image,
  busy,
  note,
  samples,
  onImage,
  onNote,
  onRun,
  onClear,
}: Props) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ingest = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return
      if (!ACCEPT.includes(file.type)) {
        alert('GlassGrid accepts PNG or JPEG only (Cerebras Gemma 4 image-input limit).')
        return
      }
      const url = await fileToDataUrl(file)
      onImage(url)
    },
    [onImage],
  )

  // Paste-from-clipboard anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
      if (item) ingest(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [ingest])

  return (
    <div className="panel">
      <div className="panel-head">
        <span><span className="dot" />Input · dashboard / chart / UI</span>
        <span>PNG · JPEG</span>
      </div>

      {!image ? (
        <div
          className={`dropzone${drag ? ' drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            ingest(e.dataTransfer.files?.[0])
          }}
        >
          <svg className="dz-icon" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <h3>Drop a dashboard screenshot</h3>
          <p>
            Drag &amp; drop, click to browse, or <span className="kbd">⌘V</span> paste from clipboard.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={(e) => ingest(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          <div className="preview-wrap">
            <img src={image} alt="dashboard to analyze" />
            <div className="preview-actions">
              <button className="mini-btn" onClick={() => inputRef.current?.click()}>Replace</button>
              <button className="mini-btn" onClick={onClear}>Clear</button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(e) => ingest(e.target.files?.[0])}
            />
          </div>
          <div className="note-row">
            <input
              value={note}
              placeholder="Optional context for the model (e.g. 'fleet telemetry, EU region')…"
              onChange={(e) => onNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) onRun()
              }}
            />
            <button className="run-btn" onClick={onRun} disabled={busy}>
              {busy ? 'ANALYZING…' : 'ANALYZE ▸'}
            </button>
          </div>
        </>
      )}

      {samples.length > 0 && (
        <div className="samples">
          <div className="samples-label">Or try a sample</div>
          <div className="sample-row">
            {samples.map((s) => (
              <div
                key={s.name}
                className="sample-thumb"
                title={s.name}
                onClick={() => onImage(s.src)}
              >
                <img src={s.src} alt={s.name} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
