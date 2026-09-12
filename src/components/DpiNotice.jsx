/**
 * Auflösungs-Prüfung für den Druck.
 *
 * Zeigt die effektive Auflösung je Bild und warnt, wenn sie für das
 * gewählte Druckformat zu niedrig ist.
 */
import { useMemo } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import { computeDpi } from '../lib/render.js'
import { resolveFormat, DPI_IDEAL, DPI_MIN } from '../lib/formats.js'

export default function DpiNotice() {
  const { project, images } = useProject()
  const format = resolveFormat(project)

  const results = useMemo(
    () => computeDpi(project, images, format.widthMm, format.heightMm),
    [project, images, format.widthMm, format.heightMm],
  )

  if (!format.widthMm) {
    return (
      <p className="note">
        Kein Druckformat gewählt – die Auflösungsprüfung gilt nur für Druckformate.
      </p>
    )
  }

  const used = results.filter((r) => r.dpi !== null)
  if (!used.length) return <p className="note">Noch keine Bilder platziert.</p>

  const worst = Math.min(...used.map((r) => r.dpi))
  const level = worst >= DPI_IDEAL ? 'ok' : worst >= DPI_MIN ? 'warn' : 'bad'
  const text = {
    ok: 'Auflösung ist für diesen Druck ausreichend.',
    warn: 'Grenzwertig – für kleine Formate meist okay, für Poster besser ein grösseres Bild.',
    bad: 'Zu niedrig für dieses Format. Bild weniger stark zoomen oder grösseres Original verwenden.',
  }[level]

  return (
    <div className={`dpi dpi--${level}`}>
      <div className="dpi__head">
        <strong>{Math.round(worst)} dpi</strong>
        <span>Ziel: {DPI_IDEAL} dpi</span>
      </div>
      <p>{text}</p>
      <ul className="dpi__list">
        {used.map((r, i) => (
          <li key={r.slotId}>
            <span>Bild {i + 1}</span>
            <span className={r.dpi < DPI_MIN ? 'is-bad' : r.dpi < DPI_IDEAL ? 'is-warn' : ''}>
              {Math.round(r.dpi)} dpi
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
