/** Panel „Layout“: Auswahl der Raster-Vorlagen. */
import { useProject } from '../../state/ProjectContext.jsx'
import { LAYOUTS } from '../../lib/layouts.js'

/** Zeichnet eine Vorlage als kleines SVG-Diagramm. */
function LayoutPreview({ layout }) {
  return (
    <svg viewBox="0 0 100 100" className="layout-preview" aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" fill="#fff" stroke="#e5e5e1" />
      {layout.cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x * 100 + 2}
          y={cell.y * 100 + 2}
          width={Math.max(0, cell.w * 100 - 4)}
          height={Math.max(0, cell.h * 100 - 4)}
          fill="#111"
          opacity={layout.freeform ? 0.75 : 1}
        />
      ))}
    </svg>
  )
}

export default function LayoutPanel() {
  const { project, setLayout } = useProject()

  return (
    <div className="panel">
      <ul className="grid grid--layouts">
        {LAYOUTS.map((layout) => (
          <li key={layout.id}>
            <button
              type="button"
              className={`layout-button${project.layoutId === layout.id ? ' is-active' : ''}`}
              onClick={() => setLayout(layout.id)}
            >
              <LayoutPreview layout={layout} />
              <span>{layout.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="note">
        Beim Wechsel bleiben bereits platzierte Bilder in ihrer Reihenfolge erhalten. Im Layout
        „Frei anordnen“ lassen sich die Zellen auf der Arbeitsfläche verschieben und skalieren.
      </p>
    </div>
  )
}
