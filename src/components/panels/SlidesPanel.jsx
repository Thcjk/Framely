/** Panel „Slide“: Vorlage, Hintergrund und neue Elemente. */
import { useProject } from '../../state/ProjectContext.jsx'
import { SLIDE_TEMPLATES, TEMPLATE_GROUPS, makeTextItem, makeImageItem, makeBlockItem, TEXT_PRESETS } from '../../lib/slides.js'

/** Zeichnet eine Vorlage als kleines SVG-Diagramm. */
function TemplatePreview({ template }) {
  const items = template.build()
  return (
    <svg viewBox="0 0 80 100" className="template-preview" aria-hidden="true">
      <rect width="80" height="100" fill={template.background ?? '#fff'} stroke="#e3e2dd" />
      {items.map((item, i) => {
        const x = item.rect.x * 80
        const y = item.rect.y * 100
        const w = item.rect.w * 80
        const h = item.rect.h * 100
        if (item.type === 'text') {
          return <rect key={i} x={x} y={y + h / 2 - 1} width={Math.min(w, 30)} height="2" fill="#9a9a94" />
        }
        return <rect key={i} x={x} y={y} width={w} height={h} fill="#111" opacity="0.85" />
      })}
    </svg>
  )
}

export default function SlidesPanel() {
  const { project, slide, setTemplate, setSlideBackground, insertItem, addSlide, copySlide, removeSlide, shiftSlide, index } =
    useProject()

  const backgrounds = ['#ffffff', '#f4f2ed', '#e8e6e1', '#141414', '#000000', '#1d2b24']

  return (
    <div className="panel">
      <h3 className="label">
        Slide {String(index + 1).padStart(2, '0')} von {String(project.slides.length).padStart(2, '0')}
      </h3>
      <div className="row">
        <button type="button" className="btn btn--ghost" onClick={() => shiftSlide(slide.id, -1)} disabled={index === 0}>
          ◀ Früher
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => shiftSlide(slide.id, 1)}
          disabled={index >= project.slides.length - 1}
        >
          Später ▶
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => copySlide(slide.id)}>
          Duplizieren
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={project.slides.length <= 1}
          onClick={() => removeSlide(slide.id)}
        >
          Löschen
        </button>
      </div>

      <h3 className="label">Vorlage der Slide</h3>
      {TEMPLATE_GROUPS.map((group) => (
        <div key={group} className="template-group">
          <span className="template-group__title">{group}</span>
          <ul className="grid grid--templates">
            {SLIDE_TEMPLATES.filter((t) => (t.group ?? 'Bild') === group).map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className={`template-button${slide.templateId === template.id ? ' is-active' : ''}`}
                  onClick={() => setTemplate(template.id)}
                  title={template.label}
                >
                  <TemplatePreview template={template} />
                  <span>{template.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h3 className="label">Hintergrund</h3>
      <div className="swatches">
        {backgrounds.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch${slide.background === color ? ' is-active' : ''}`}
            style={{ background: color }}
            aria-label={`Hintergrund ${color}`}
            onClick={() => setSlideBackground(color)}
          />
        ))}
        <input
          type="color"
          className="swatch swatch--input"
          value={slide.background}
          onChange={(e) => setSlideBackground(e.target.value)}
          aria-label="Eigene Hintergrundfarbe"
        />
      </div>

      <h3 className="label">Element hinzufügen</h3>
      <div className="row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => insertItem(makeImageItem({ x: 0.2, y: 0.28, w: 0.5, h: 0.4 }))}
        >
          + Bild
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() =>
            insertItem(makeTextItem({ x: 0.1, y: 0.44, w: 0.6, h: 0.12 }, { preset: 'title', text: 'Text' }))
          }
        >
          + Text
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => insertItem(makeBlockItem({ x: 0, y: 0, w: 0.5, h: 1 }, '#ffffff'))}
        >
          + Fläche
        </button>
      </div>

      <h3 className="label">Textbausteine</h3>
      <div className="row">
        {['display', 'title', 'quote', 'label', 'credits', 'micro'].map((preset) => (
          <button
            key={preset}
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              insertItem(
                makeTextItem({ x: 0.08, y: 0.45, w: 0.7, h: 0.12 }, {
                  preset,
                  text: TEXT_PRESETS[preset].label,
                }),
              )
            }
          >
            {TEXT_PRESETS[preset].label}
          </button>
        ))}
      </div>

      <h3 className="label">Neue Slide</h3>
      <div className="row">
        <button type="button" className="btn" onClick={() => addSlide('inset')}>
          Bildseite
        </button>
        <button type="button" className="btn" onClick={() => addSlide('split-right')}>
          Split
        </button>
        <button type="button" className="btn" onClick={() => addSlide('info-dark')}>
          Infoseite
        </button>
      </div>
    </div>
  )
}
