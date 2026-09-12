/**
 * Panel „Element“: alles zum gerade gewählten Element.
 * Für Text: Inhalt, Rolle, Grösse, Ausrichtung, Laufweite, Farbe.
 * Für Bilder: Rahmen, Ausschnitt, Position und Grösse auf 0.1 % genau.
 */
import { useProject } from '../../state/ProjectContext.jsx'
import { TEXT_PRESETS } from '../../lib/slides.js'
import { FRAME_STYLES } from '../../lib/frames.js'
import { resolveStyle } from '../../lib/text.js'
import { ZOOM_MAX, ZOOM_MIN } from '../../lib/interact.js'

const AUTO_FIELDS = [
  { value: '', label: 'Fester Text' },
  { value: 'pageNumber', label: 'Seitenzahl' },
  { value: 'credits', label: 'Credits' },
  { value: 'series', label: 'Serienname' },
  { value: 'handle', label: 'Website / Handle' },
  { value: 'location', label: 'Ort' },
  { value: 'date', label: 'Datum' },
]

/** Ein Zahlenfeld für Position und Grösse (in Prozent der Slide). */
function NumberField({ label, value, onChange }) {
  return (
    <label className="field field--inline">
      <span className="label">{label}</span>
      <input
        type="number"
        className="input input--small"
        value={Math.round(value * 1000) / 10}
        step="0.5"
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
    </label>
  )
}

export default function ElementPanel() {
  const { project, slide, selectedItemId, patchItem, deleteItem, stackItem, setFrameStyle, patchFrame, applyFrameToAll } =
    useProject()

  const item = slide.items.find((i) => i.id === selectedItemId)

  if (!item) {
    return (
      <div className="panel">
        <p className="note">
          Kein Element gewählt. Auf der Arbeitsfläche ein Bild oder einen Text antippen – dann
          erscheinen hier alle Einstellungen dazu.
        </p>
      </div>
    )
  }

  const setRect = (patch) => patchItem(item.id, { rect: { ...item.rect, ...patch } })
  const style = item.type === 'text' ? resolveStyle(item) : null
  const frame = item.type === 'image' ? (item.frame ?? project.frame) : null

  return (
    <div className="panel">
      <h3 className="label">
        {item.type === 'text' ? 'Text' : item.type === 'block' ? 'Fläche' : 'Bild'}
      </h3>

      {item.type === 'text' && (
        <>
          <label className="field">
            <span className="label">Inhalt</span>
            <textarea
              className="input input--area"
              rows={4}
              value={item.text ?? ''}
              disabled={Boolean(item.auto)}
              onChange={(e) => patchItem(item.id, { text: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="label">Automatischer Inhalt</span>
            <select
              className="input"
              value={item.auto ?? ''}
              onChange={(e) => patchItem(item.id, { auto: e.target.value || null })}
            >
              {AUTO_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Rolle</span>
            <select
              className="input"
              value={item.preset}
              onChange={(e) => patchItem(item.id, { preset: e.target.value, style: {} })}
            >
              {Object.entries(TEXT_PRESETS).map(([id, preset]) => (
                <option key={id} value={id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Schriftgrösse · {(style.size * 100).toFixed(1)} %</span>
            <input
              type="range"
              min="0.8"
              max="18"
              step="0.1"
              value={style.size * 100}
              onChange={(e) => patchItem(item.id, (i) => ({ style: { ...i.style, size: Number(e.target.value) / 100 } }))}
            />
          </label>

          <label className="field">
            <span className="label">Laufweite · {(style.tracking * 1000).toFixed(0)}</span>
            <input
              type="range"
              min="-40"
              max="300"
              step="5"
              value={style.tracking * 1000}
              onChange={(e) => patchItem(item.id, (i) => ({ style: { ...i.style, tracking: Number(e.target.value) / 1000 } }))}
            />
          </label>

          <div className="field">
            <span className="label">Ausrichtung</span>
            <div className="segmented segmented--small">
              {[['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']].map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  className={style.align === value ? 'is-active' : ''}
                  onClick={() => patchItem(item.id, (i) => ({ style: { ...i.style, align: value } }))}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label">Schrift</span>
            <div className="segmented segmented--small">
              {[['sans', 'Grotesk'], ['serif', 'Serif']].map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  className={style.family === value ? 'is-active' : ''}
                  onClick={() => patchItem(item.id, (i) => ({ style: { ...i.style, family: value } }))}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="row row--between">
            <label className="check">
              <input
                type="checkbox"
                checked={style.uppercase}
                onChange={(e) => patchItem(item.id, (i) => ({ style: { ...i.style, uppercase: e.target.checked } }))}
              />
              Versalien
            </label>
            <label className="field field--color">
              <span className="label">Farbe</span>
              <input
                type="color"
                value={item.color ?? '#111111'}
                onChange={(e) => patchItem(item.id, { color: e.target.value })}
              />
            </label>
            <button type="button" className="btn btn--ghost" onClick={() => patchItem(item.id, { color: null })}>
              Auto
            </button>
          </div>
        </>
      )}

      {item.type === 'block' && (
        <label className="field field--color">
          <span className="label">Farbe der Fläche</span>
          <input type="color" value={item.color} onChange={(e) => patchItem(item.id, { color: e.target.value })} />
        </label>
      )}

      {item.type === 'image' && (
        <>
          <h4 className="label">Rahmen dieses Bildes</h4>
          <ul className="list">
            {FRAME_STYLES.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`option${frame.styleId === option.id ? ' is-active' : ''}`}
                  onClick={() => setFrameStyle(option.id, { itemId: item.id })}
                >
                  <span className="option__text">
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {frame.styleId !== 'none' && (
            <label className="field">
              <span className="label">Randbreite · {frame.width.toFixed(1)} %</span>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={frame.width}
                onChange={(e) => patchFrame({ width: Number(e.target.value) }, { itemId: item.id })}
              />
            </label>
          )}

          {frame.styleId !== 'none' && frame.styleId !== 'hairline' && (
            <label className="field field--color">
              <span className="label">Rahmenfarbe</span>
              <input
                type="color"
                value={frame.color}
                onChange={(e) => patchFrame({ color: e.target.value }, { itemId: item.id })}
              />
            </label>
          )}

          {(frame.styleId === 'hairline' || frame.styleId === 'passepartout') && (
            <label className="field field--color">
              <span className="label">Linienfarbe</span>
              <input
                type="color"
                value={frame.line}
                onChange={(e) => patchFrame({ line: e.target.value }, { itemId: item.id })}
              />
            </label>
          )}

          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={() => applyFrameToAll(frame)}>
              Auf alle Bilder übertragen
            </button>
          </div>

          <label className="field">
            <span className="label">Ausschnitt-Zoom · {(item.zoom ?? 1).toFixed(2)}×</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step="0.01"
              value={item.zoom ?? 1}
              onChange={(e) => patchItem(item.id, { zoom: Number(e.target.value) })}
            />
          </label>

          <div className="row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => patchItem(item.id, { zoom: 1, offsetX: 0, offsetY: 0 })}
            >
              Ausschnitt zurücksetzen
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => patchItem(item.id, { rotation: ((item.rotation ?? 0) + 90) % 360 })}
            >
              90° drehen
            </button>
          </div>
        </>
      )}

      <h4 className="label">Position &amp; Grösse</h4>
      <div className="grid grid--fields">
        <NumberField label="X" value={item.rect.x} onChange={(x) => setRect({ x })} />
        <NumberField label="Y" value={item.rect.y} onChange={(y) => setRect({ y })} />
        <NumberField label="Breite" value={item.rect.w} onChange={(w) => setRect({ w })} />
        <NumberField label="Höhe" value={item.rect.h} onChange={(h) => setRect({ h })} />
      </div>

      <div className="row">
        <button type="button" className="btn btn--ghost" onClick={() => stackItem(item.id, 'front')}>
          Nach vorne
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => stackItem(item.id, 'back')}>
          Nach hinten
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => deleteItem(item.id)}>
          Löschen
        </button>
      </div>
    </div>
  )
}
