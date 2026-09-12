/**
 * Panel „Layout“: Vorlage der Slide, Hintergrund und neue Elemente.
 *
 * Die 35 Vorlagen stehen nicht alle untereinander, sondern hinter einer
 * Gruppenauswahl – so bleibt das Panel kurz und man sieht auf einen Blick,
 * welche Art von Seite man baut.
 */
import { useEffect, useState } from 'react'
import { useProject } from '../../state/ProjectContext.jsx'
import {
  SLIDE_TEMPLATES,
  TEMPLATE_GROUPS,
  GROUP_LABELS,
  getTemplate,
  makeTextItem,
  makeImageItem,
  makeBlockItem,
  TEXT_PRESETS,
} from '../../lib/slides.js'

/** Zeichnet eine Vorlage als kleines Diagramm. */
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
  const {
    project, slide, index, setTemplate, setSlideBackground, insertItem,
    addSlide, copySlide, removeSlide, shiftSlide,
  } = useProject()

  // Die Gruppe folgt der aktuellen Slide, lässt sich aber frei wechseln.
  const [group, setGroup] = useState(() => getTemplate(slide.templateId).group ?? 'Bild')
  useEffect(() => {
    setGroup(getTemplate(slide.templateId).group ?? 'Bild')
    // Nur beim Wechsel der Slide, nicht bei jedem Vorlagenklick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.id])

  const backgrounds = ['#ffffff', '#f4f2ed', '#e8e6e1', '#141414', '#000000', '#1d2b24']
  const visible = SLIDE_TEMPLATES.filter((t) => (t.group ?? 'Bild') === group)

  return (
    <div className="panel">
      <div className="panel__head">
        <span className="panel__title">
          Slide {String(index + 1).padStart(2, '0')} / {String(project.slides.length).padStart(2, '0')}
        </span>
        <div className="iconrow">
          <button type="button" onClick={() => shiftSlide(slide.id, -1)} disabled={index === 0} title="Nach vorne schieben">
            ◀
          </button>
          <button
            type="button"
            onClick={() => shiftSlide(slide.id, 1)}
            disabled={index >= project.slides.length - 1}
            title="Nach hinten schieben"
          >
            ▶
          </button>
          <button type="button" onClick={() => copySlide(slide.id)} title="Duplizieren">
            ⧉
          </button>
          <button
            type="button"
            onClick={() => removeSlide(slide.id)}
            disabled={project.slides.length <= 1}
            title="Slide löschen"
          >
            ✕
          </button>
        </div>
      </div>

      <h3 className="section">Vorlage</h3>
      <div className="chips" role="tablist" aria-label="Art der Vorlage">
        {TEMPLATE_GROUPS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={group === name}
            className={`chip${group === name ? ' is-active' : ''}`}
            onClick={() => setGroup(name)}
          >
            {GROUP_LABELS[name] ?? name}
          </button>
        ))}
      </div>

      <ul className="grid grid--templates">
        {visible.map((template) => (
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

      <h3 className="section">Hintergrund</h3>
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

      <h3 className="section">Element hinzufügen</h3>
      <div className="row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => insertItem(makeImageItem({ x: 0.2, y: 0.28, w: 0.5, h: 0.4 }))}
        >
          Bild
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => insertItem(makeBlockItem({ x: 0, y: 0, w: 0.5, h: 1 }, '#ffffff'))}
        >
          Farbfläche
        </button>
      </div>
      <div className="row">
        {['display', 'title', 'quote', 'body', 'caption', 'micro'].map((preset) => (
          <button
            key={preset}
            type="button"
            className="btn btn--ghost"
            title={`Text einfügen: ${TEXT_PRESETS[preset].label}`}
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

      <h3 className="section">Neue Slide</h3>
      <div className="row">
        <button type="button" className="btn" onClick={() => addSlide('inset')}>
          Bildseite
        </button>
        <button type="button" className="btn" onClick={() => addSlide('split-right')}>
          Halb / Halb
        </button>
        <button type="button" className="btn" onClick={() => addSlide('free')}>
          Leere Seite
        </button>
      </div>
    </div>
  )
}
