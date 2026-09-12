/**
 * Dialog „Druck bestellen“.
 *
 * Erzeugt die fertige Druckdatei und führt anschliessend zum Anbieter.
 * Warum kein Direkt-Checkout? Siehe Kommentar in lib/printServices.js.
 */
import { useState } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import { PRINT_SERVICES, printSpec } from '../lib/printServices.js'
import { exportProject, downloadAll } from '../lib/export.js'
import { outputPixels, resolveFormat } from '../lib/formats.js'
import DpiNotice from './DpiNotice.jsx'

export default function PrintOrderDialog({ onClose }) {
  const { project, slide, images, notify } = useProject()
  const [dpi] = useState(300)
  const [scope, setScope] = useState('current')
  const [running, setRunning] = useState(false)
  const format = resolveFormat(project)
  const pixels = outputPixels(project, { dpi })

  const spec = printSpec({
    formatLabel: format.label,
    widthMm: format.widthMm,
    heightMm: format.heightMm,
    width: pixels.width,
    height: pixels.height,
    dpi,
  })

  const createFile = async (type) => {
    setRunning(true)
    try {
      const result = await exportProject(project, images, {
        type,
        scope,
        slideId: slide.id,
        dpi,
        quality: 0.95,
      })
      await downloadAll(result.files)
      notify(`${result.files.length} Druckdatei(en) erstellt.`)
    } catch (error) {
      console.error(error)
      notify('Die Druckdatei konnte nicht erzeugt werden.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Druck bestellen">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel">
        <header className="modal__head">
          <h2>Druck bestellen</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Schliessen
          </button>
        </header>

        <div className="modal__body">
          <p className="note">
            Framely läuft ohne Server. Die geprüften Druckdienste verlangen für eine Bestellung
            einen geheimen API-Schlüssel – der wäre im Browser für alle sichtbar. Deshalb
            erzeugt Framely die fertige Druckdatei, hochgeladen wird sie direkt beim Anbieter.
          </p>

          <ol className="steps">
            <li>
              <h3>1 · Druckdatei erzeugen</h3>
              <p>
                {format.label} · {format.widthMm} × {format.heightMm} mm ·{' '}
                {pixels.width} × {pixels.height} px bei {dpi} dpi
              </p>
              <div className="segmented segmented--small">
                <button type="button" className={scope === 'current' ? 'is-active' : ''} onClick={() => setScope('current')}>
                  Diese Slide
                </button>
                <button type="button" className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}>
                  Alle Slides
                </button>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={running}
                  onClick={() => createFile('jpg')}
                >
                  JPG (300 dpi)
                </button>
                <button type="button" className="btn" disabled={running} onClick={() => createFile('pdf')}>
                  PDF
                </button>
              </div>
              <DpiNotice />
            </li>

            <li>
              <h3>2 · Anbieter wählen</h3>
              <ul className="services">
                {PRINT_SERVICES.map((service) => (
                  <li key={service.id}>
                    <a href={service.url} target="_blank" rel="noreferrer noopener">
                      <strong>{service.name}</strong>
                      <small>
                        {service.region} · {service.note}
                      </small>
                    </a>
                  </li>
                ))}
              </ul>
            </li>

            <li>
              <h3>3 · Beim Upload beachten</h3>
              <pre className="spec">{spec}</pre>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(spec)
                  notify('Angaben kopiert.')
                }}
              >
                Angaben kopieren
              </button>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
