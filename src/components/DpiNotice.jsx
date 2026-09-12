/**
 * Auflösungs-Prüfung für den Druck.
 * Zeigt die effektive Auflösung je Bild der aktuellen Slide und warnt,
 * wenn sie für das gewählte Druckformat zu niedrig ist.
 */
import { useMemo } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import { computeDpi } from '../lib/render.js'
import { resolveFormat, DPI_IDEAL, DPI_MIN } from '../lib/formats.js'

export default function DpiNotice() {
  const { project, slide, images } = useProject()
  const format = resolveFormat(project)

  const results = useMemo(
    () => computeDpi(project, slide, images, format.widthMm, format.heightMm),
    [project, slide, images, format.widthMm, format.heightMm],
  )

  if (!format.widthMm) {
    return <p className="note">Die Auflösungsprüfung gilt nur für Druckformate.</p>
  }
  if (!results.length) return <p className="note">Auf dieser Slide ist noch kein Bild platziert.</p>

  const worst = Math.min(...results.map((r) => r.dpi))
  const level = worst >= DPI_IDEAL ? 'ok' : worst >= DPI_MIN ? 'warn' : 'bad'
  const text = {
    ok: 'Auflösung ist für diesen Druck ausreichend.',
    warn: 'Grenzwertig – für kleine Formate meist okay, für Poster besser ein grösseres Bild.',
    bad: 'Zu niedrig für dieses Format. Bild weniger stark zoomen, kleiner setzen oder ein grösseres Original verwenden.',
  }[level]

  return (
    <div className={`dpi dpi--${level}`}>
      <div className="dpi__head">
        <strong>{Math.round(worst)} dpi</strong>
        <span>Ziel: {DPI_IDEAL} dpi</span>
      </div>
      <p>{text}</p>
      <ul className="dpi__list">
        {results.map((r, i) => (
          <li key={r.itemId}>
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
