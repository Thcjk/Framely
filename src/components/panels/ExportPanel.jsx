/** Panel „Export“: Bilddatei, PDF und Weg zur Druckbestellung. */
import { useMemo, useState } from 'react'
import { useProject } from '../../state/ProjectContext.jsx'
import { exportProject, download, limitSize } from '../../lib/export.js'
import { outputPixels, resolveFormat, DPI_IDEAL } from '../../lib/formats.js'
import DpiNotice from '../DpiNotice.jsx'

const LONG_EDGES = [
  { value: 1080, label: '1080 px', sub: 'Instagram Standard' },
  { value: 1440, label: '1440 px', sub: 'empfohlen' },
  { value: 2048, label: '2048 px', sub: 'maximale Schärfe' },
]

const DPI_OPTIONS = [150, 300, 600]

export default function ExportPanel({ onOrderPrint }) {
  const { project, images, notify } = useProject()
  const [type, setType] = useState('jpg')
  const [longEdge, setLongEdge] = useState(1440)
  const [dpi, setDpi] = useState(DPI_IDEAL)
  const [quality, setQuality] = useState(0.92)
  const [running, setRunning] = useState(false)

  const isPrint = project.format.mode === 'print'
  const format = resolveFormat(project)

  const size = useMemo(() => {
    const target = outputPixels(project, { dpi, longEdge })
    return limitSize(target.width, target.height)
  }, [project, dpi, longEdge])

  const run = async () => {
    setRunning(true)
    try {
      const result = await exportProject(project, images, { type, dpi, longEdge, quality })
      download(result.blob, result.filename)
      notify(
        `${result.filename} erstellt (${result.width} × ${result.height} px)` +
          (result.reduced ? ' – Auflösung wurde vom Browser begrenzt.' : ''),
      )
    } catch (error) {
      console.error(error)
      notify('Export fehlgeschlagen. Eventuell ist das Format zu gross für diesen Browser.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="panel">
      <h3 className="label">Dateityp</h3>
      <div className="segmented">
        {[
          ['jpg', 'JPG'],
          ['png', 'PNG'],
          ['pdf', 'PDF'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={type === value ? 'is-active' : ''}
            onClick={() => setType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {isPrint ? (
        <>
          <h3 className="label">Auflösung</h3>
          <div className="segmented segmented--small">
            {DPI_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={dpi === value ? 'is-active' : ''}
                onClick={() => setDpi(value)}
              >
                {value} dpi
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h3 className="label">Längste Kante</h3>
          <ul className="list">
            {LONG_EDGES.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={`option${longEdge === option.value ? ' is-active' : ''}`}
                  onClick={() => setLongEdge(option.value)}
                >
                  <span className="option__text">
                    <strong>{option.label}</strong>
                    <small>{option.sub}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {type !== 'png' && (
        <label className="field">
          <span className="label">JPEG-Qualität · {Math.round(quality * 100)} %</span>
          <input
            type="range"
            min="0.6"
            max="1"
            step="0.01"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
        </label>
      )}

      <dl className="summary">
        <div>
          <dt>Format</dt>
          <dd>{format.label}</dd>
        </div>
        <div>
          <dt>Pixel</dt>
          <dd>
            {size.width} × {size.height}
          </dd>
        </div>
        {isPrint && (
          <div>
            <dt>Papier</dt>
            <dd>
              {format.widthMm} × {format.heightMm} mm
            </dd>
          </div>
        )}
      </dl>

      {size.reduced && (
        <p className="note note--warn">
          Die Datei wäre für den Browser zu gross und wird auf {size.width} × {size.height} px
          begrenzt. Für sehr grosse Poster eine niedrigere dpi-Zahl wählen.
        </p>
      )}

      <button type="button" className="btn btn--primary" onClick={run} disabled={running}>
        {running ? 'Wird erstellt …' : `Als ${type.toUpperCase()} exportieren`}
      </button>

      {isPrint && (
        <>
          <h3 className="label">Druck</h3>
          <DpiNotice />
          <button type="button" className="btn" onClick={onOrderPrint}>
            Druck bestellen
          </button>
        </>
      )}
    </div>
  )
}
