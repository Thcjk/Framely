/**
 * Datenmodell eines Projekts.
 *
 * Ein Projekt = ein Carousel aus mehreren Slides.
 * Bilddaten liegen NICHT im Projekt, sondern separat in der IndexedDB
 * (siehe db.js); das Projekt referenziert sie nur über ihre id. So bleibt
 * das Projekt ein kleines, gut serialisierbares JSON-Objekt.
 */

import { makeSlide, uid, makeImageItem, makeTextItem, makeBlockItem } from './slides.js'
import { frameDefaults } from './frames.js'

export { uid }

export function createProject(name = 'Neue Serie') {
  return {
    id: uid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    format: {
      mode: 'social', // 'social' | 'print'
      socialId: 'portrait45', // 4:5 ist das Standardformat für Instagram-Carousels
      printId: '13x18',
      orientation: 'portrait',
    },
    frame: frameDefaults('none'),
    /**
     * Projektweite Angaben. Text-Elemente mit `auto` greifen darauf zu –
     * die Credits stehen also nur an einer Stelle und gelten für alle Slides.
     */
    meta: {
      series: 'Serie 01',
      credits: 'Chairo & Tim',
      location: '',
      date: '',
      handle: 'chairoundtimphotography.ch',
      numbering: 'nn/nn', // 'nn/nn' | 'nn' | 'n/n'
    },
    slides: [makeSlide('cover-type'), makeSlide('inset'), makeSlide('split-right')],
    activeSlideId: null, // wird beim Öffnen gesetzt
  }
}

export const activeSlide = (project) =>
  project.slides.find((s) => s.id === project.activeSlideId) ?? project.slides[0]

export const slideIndex = (project, slideId) =>
  project.slides.findIndex((s) => s.id === slideId)

/** Ersetzt eine Slide (unveränderlich, wie überall im Projekt). */
export function updateSlide(project, slideId, patch) {
  return {
    ...project,
    slides: project.slides.map((s) =>
      s.id === slideId ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s,
    ),
  }
}

/** Ersetzt ein Element innerhalb einer Slide. */
export function updateItem(project, slideId, itemId, patch) {
  return updateSlide(project, slideId, (slide) => ({
    items: slide.items.map((item) =>
      item.id === itemId ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item,
    ),
  }))
}

export function addItem(project, slideId, item) {
  return updateSlide(project, slideId, (slide) => ({ items: [...slide.items, item] }))
}

export function removeItem(project, slideId, itemId) {
  return updateSlide(project, slideId, (slide) => ({
    items: slide.items.filter((item) => item.id !== itemId),
  }))
}

/** Verschiebt ein Element in der Stapelreihenfolge (ganz nach vorne/hinten). */
export function reorderItem(project, slideId, itemId, direction) {
  return updateSlide(project, slideId, (slide) => {
    const item = slide.items.find((i) => i.id === itemId)
    if (!item) return {}
    const rest = slide.items.filter((i) => i.id !== itemId)
    return { items: direction === 'front' ? [...rest, item] : [item, ...rest] }
  })
}

/** Neue Slide hinter der aktuellen einfügen. */
export function insertSlide(project, templateId, afterId = null) {
  const slide = makeSlide(templateId, { background: activeSlide(project)?.background ?? '#ffffff' })
  const at = afterId ? slideIndex(project, afterId) + 1 : project.slides.length
  const slides = [...project.slides]
  slides.splice(at, 0, slide)
  return { ...project, slides, activeSlideId: slide.id }
}

export function duplicateSlide(project, slideId) {
  const index = slideIndex(project, slideId)
  if (index < 0) return project
  const source = project.slides[index]
  const copy = {
    ...source,
    id: uid(),
    items: source.items.map((item) => ({ ...item, id: uid() })),
  }
  const slides = [...project.slides]
  slides.splice(index + 1, 0, copy)
  return { ...project, slides, activeSlideId: copy.id }
}

export function deleteSlide(project, slideId) {
  if (project.slides.length <= 1) return project
  const index = slideIndex(project, slideId)
  const slides = project.slides.filter((s) => s.id !== slideId)
  return {
    ...project,
    slides,
    activeSlideId: (slides[index] ?? slides[slides.length - 1]).id,
  }
}

/** Slide um eine Position nach vorne oder hinten schieben. */
export function moveSlide(project, slideId, delta) {
  const from = slideIndex(project, slideId)
  const to = from + delta
  if (from < 0 || to < 0 || to >= project.slides.length) return project
  const slides = [...project.slides]
  const [slide] = slides.splice(from, 1)
  slides.splice(to, 0, slide)
  return { ...project, slides }
}

/**
 * Verteilt neu importierte Bilder auf freie Bildplätze – erst in der
 * aktuellen Slide, dann in den folgenden. Bleiben Bilder übrig, entstehen
 * neue Slides, damit nichts verloren geht.
 */
export function distributeImages(project, imageIds) {
  const queue = [...imageIds]
  if (!queue.length) return project

  const startIndex = Math.max(0, slideIndex(project, project.activeSlideId))
  const order = [
    ...project.slides.slice(startIndex),
    ...project.slides.slice(0, startIndex),
  ]

  const filled = new Map()
  for (const slide of order) {
    if (!queue.length) break
    const items = slide.items.map((item) => {
      if (item.type !== 'image' || item.imageId || !queue.length) return item
      return { ...item, imageId: queue.shift(), zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }
    })
    filled.set(slide.id, items)
  }

  let slides = project.slides.map((slide) =>
    filled.has(slide.id) ? { ...slide, items: filled.get(slide.id) } : slide,
  )

  // Rest: je eine neue Slide pro übrigem Bild.
  while (queue.length) {
    const slide = makeSlide(queue.length > 1 ? 'two-uneven' : 'full-margin', {
      background: slides[slides.length - 1]?.background ?? '#ffffff',
    })
    slide.items = slide.items.map((item) => {
      if (item.type !== 'image' || !queue.length) return item
      return { ...item, imageId: queue.shift() }
    })
    slides = [...slides, slide]
  }

  return { ...project, slides }
}

/** Alle im Projekt verwendeten Bild-ids (z.B. zum Aufräumen der Datenbank). */
export function usedImageIds(project) {
  const ids = new Set()
  project.slides.forEach((slide) =>
    slide.items.forEach((item) => item.type === 'image' && item.imageId && ids.add(item.imageId)),
  )
  return [...ids]
}

/**
 * Panorama: ein Bild über mehrere Slides laufen lassen.
 *
 * Jede Slide zeigt einen senkrechten Streifen desselben Bildes. Dafür wird
 * das Bild so weit vergrössert, dass es `count` Slide-Breiten einnimmt
 * (zoom), und pro Slide passend verschoben (offsetX in Anteilen der
 * Slide-Breite: von +(count-1)/2 bis -(count-1)/2).
 */
export function panoramaSuggestion(image, slideRatio) {
  if (!image) return 3
  const imageRatio = image.width / image.height
  return Math.max(2, Math.min(8, Math.ceil(imageRatio / slideRatio)))
}

export function spreadPanorama(project, imageId, image, slideRatio, count, afterId = null) {
  const imageRatio = image ? image.width / image.height : 1
  // zoom bezieht sich auf "cover"; siehe render.js/placeImage.
  const zoom = Math.max(1, count * Math.min(1, slideRatio / imageRatio))

  const slides = Array.from({ length: count }, (_, k) => {
    const slide = makeSlide('full', { background: activeSlide(project)?.background ?? '#ffffff' })
    slide.items = [
      makeImageItem({ x: 0, y: 0, w: 1, h: 1 }, {
        imageId,
        zoom,
        offsetX: (count - 1) / 2 - k,
        offsetY: 0,
      }),
    ]
    return slide
  })

  const at = afterId ? slideIndex(project, afterId) + 1 : project.slides.length
  const next = [...project.slides]
  next.splice(at, 0, ...slides)
  return { ...project, slides: next, activeSlideId: slides[0].id }
}

export { makeImageItem, makeTextItem, makeBlockItem }
