/** Panel „Rahmen“: Stil, Breite, Abstand und Farben. */
import { useProject } from '../../state/ProjectContext.jsx'
import { FRAME_STYLES } from '../../lib/frames.js'

export default function FramePanel() {
  const { project, setFrameStyle, patchFrame } = useProject()
  const frame = project.frame
  const style = FRAME_STYLES.find((s) => s.id === frame.styleId) ?? FRAME_STYLES[0]

  return (
    <div className="panel">
      <ul className="list">
        {FRAME_STYLES.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`option${frame.styleId === item.id ? ' is-active' : ''}`}
              onClick={() => setFrameStyle(item.id)}
            >
              <span className="option__text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {style.id !== 'none' && (
        <>
          <label className="field">
            <span className="label">Aussenrand · {frame.border.toFixed(1)} %</span>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={frame.border}
              onChange={(e) => patchFrame({ border: Number(e.target.value) })}
            />
          </label>

          <label className="field">
            <span className="label">Abstand zwischen Bildern · {frame.gap.toFixed(1)} %</span>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={frame.gap}
              onChange={(e) => patchFrame({ gap: Number(e.target.value) })}
            />
          </label>
        </>
      )}

      <label className="field field--color">
        <span className="label">Hintergrund / Rahmenfarbe</span>
        <input
          type="color"
          value={frame.background}
          onChange={(e) => patchFrame({ background: e.target.value })}
        />
      </label>

      {(style.id === 'passepartout' || style.id === 'hairline') && (
        <label className="field field--color">
          <span className="label">Linienfarbe</span>
          <input type="color" value={frame.line} onChange={(e) => patchFrame({ line: e.target.value })} />
        </label>
      )}

      {style.id === 'polaroid' && (
        <label className="field field--color">
          <span className="label">Kartenfarbe</span>
          <input type="color" value={frame.card} onChange={(e) => patchFrame({ card: e.target.value })} />
        </label>
      )}

      <div className="swatches">
        {['#ffffff', '#f4f2ed', '#111111', '#1d3557', '#c8c2b6'].map((color) => (
          <button
            key={color}
            type="button"
            className="swatch"
            style={{ background: color }}
            aria-label={`Hintergrund ${color}`}
            onClick={() => patchFrame({ background: color })}
          />
        ))}
      </div>
    </div>
  )
}
