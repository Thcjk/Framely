/**
 * Die Slide-Leiste: alle Seiten des Carousels in ihrer Reihenfolge.
 * Jede Vorschau wird mit demselben Renderer gezeichnet wie die grosse
 * Arbeitsfläche – nur eben sehr klein.
 */

import { useEffect, useRef } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import { renderSlide } from '../lib/render.js'
import { resolveFormat } from '../lib/formats.js'

function SlideThumb({ slide, index }) {
  const { project, images } = useProject()
  const canvasRef = useRef(null)
  const total = project.slides.length
  const ratio = resolveFormat(project).ratio

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const H = 120
    const W = Math.round(H * ratio)
    canvas.width = W
    canvas.height = H
    renderSlide(canvas.getContext('2d'), {
      project, slide, images, index, total, W, H, placeholders: true,
    })
  }, [project, slide, images, index, total, ratio])

  return <canvas ref={canvasRef} className="slide-thumb__canvas" />
}

export default function SlideStrip() {
  const { project, slide, selectSlide, addSlide, copySlide, removeSlide, shiftSlide } = useProject()

  return (
    <div className="slidestrip">
      <ol className="slidestrip__list">
        {project.slides.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              className={`slide-thumb${item.id === slide.id ? ' is-active' : ''}`}
              onClick={() => selectSlide(item.id)}
              title={`Slide ${i + 1}`}
            >
              <SlideThumb slide={item} index={i} />
              <span className="slide-thumb__number">{String(i + 1).padStart(2, '0')}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="slide-thumb slide-thumb--add"
            onClick={() => addSlide('inset')}
            title="Slide hinzufügen"
          >
            +
          </button>
        </li>
      </ol>

      <div className="slidestrip__tools">
        <span className="slidestrip__label">Slides</span>
        <div className="iconrow">
          <button type="button" onClick={() => shiftSlide(slide.id, -1)} title="Slide nach vorne schieben">
            ◀
          </button>
          <button type="button" onClick={() => shiftSlide(slide.id, 1)} title="Slide nach hinten schieben">
            ▶
          </button>
          <button type="button" onClick={() => copySlide(slide.id)} title="Slide duplizieren">
            ⧉
          </button>
          <button
            type="button"
            disabled={project.slides.length <= 1}
            onClick={() => removeSlide(slide.id)}
            title="Slide löschen"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
