/**
 * Hilfsfunktionen für die Bedienung auf der Leinwand.
 *
 * Zwei Ebenen der Manipulation:
 *   1. das ELEMENT auf der Slide (verschieben, Grösse ändern)
 *   2. das BILD innerhalb seines Elements (Ausschnitt: verschieben, zoomen)
 */

import { toPixels, photoRect, placeImage, clampOffsets } from './render.js'
import { itemFrame } from './frames.js'

export const ZOOM_MIN = 1
export const ZOOM_MAX = 8
export const MIN_SIZE = 0.04

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Das Foto-Rechteck eines Bild-Elements in Pixeln. */
export const itemPhotoRect = (item, project, W, H) =>
  photoRect(toPixels(item.rect, W, H), itemFrame(item, project))

/**
 * Findet das oberste Element unter einem Punkt (Leinwand-Koordinaten).
 * Die Elementliste ist von hinten nach vorne gestapelt, also rückwärts suchen.
 */
export function hitTest(slide, W, H, x, y) {
  for (let i = slide.items.length - 1; i >= 0; i--) {
    const item = slide.items[i]
    const box = toPixels(item.rect, W, H)
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
      return { item, index: i, box }
    }
  }
  return null
}

/** Die vier Ecken eines Elements als Anfasser. */
export const HANDLES = ['nw', 'ne', 'sw', 'se']

export function handleAt(box, x, y, size) {
  const points = {
    nw: [box.x, box.y],
    ne: [box.x + box.w, box.y],
    sw: [box.x, box.y + box.h],
    se: [box.x + box.w, box.y + box.h],
  }
  for (const name of HANDLES) {
    const [hx, hy] = points[name]
    if (Math.abs(x - hx) <= size && Math.abs(y - hy) <= size) return name
  }
  return null
}

/** Element verschieben (Werte relativ 0..1). */
export function moveRect(rect, dx, dy) {
  return clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy })
}

/** Element an einer Ecke skalieren. */
export function resizeRect(rect, handle, dx, dy, keepRatio = false) {
  let { x, y, w, h } = rect
  if (handle === 'se') {
    w += dx
    h += dy
  } else if (handle === 'sw') {
    x += dx
    w -= dx
    h += dy
  } else if (handle === 'ne') {
    y += dy
    w += dx
    h -= dy
  } else if (handle === 'nw') {
    x += dx
    y += dy
    w -= dx
    h -= dy
  }

  if (keepRatio && rect.w > 0) {
    const ratio = rect.h / rect.w
    const nextH = Math.max(MIN_SIZE, w * ratio)
    if (handle === 'nw' || handle === 'ne') y += h - nextH
    h = nextH
  }

  return clampRect({ x, y, w, h })
}

/** Hält ein Element innerhalb der Slide und über der Mindestgrösse. */
export function clampRect(rect) {
  const w = clamp(rect.w, MIN_SIZE, 2)
  const h = clamp(rect.h, MIN_SIZE, 2)
  return { x: clamp(rect.x, -0.5, 1.5 - w * 0.5), y: clamp(rect.y, -0.5, 1.5 - h * 0.5), w, h }
}

/** Bildausschnitt verschieben. */
export function panImage(item, image, rect, dx, dy) {
  const next = {
    ...item,
    offsetX: (item.offsetX ?? 0) + dx / rect.w,
    offsetY: (item.offsetY ?? 0) + dy / rect.h,
  }
  return clampOffsets(image, rect, next)
}

/**
 * Bildausschnitt zoomen und dabei den Punkt (px, py) unter dem Finger
 * festhalten – so fühlt sich Zoomen natürlich an.
 */
export function zoomImage(item, image, rect, factor, px, py) {
  const before = placeImage(image, rect, item)
  const zoom = clamp((item.zoom ?? 1) * factor, ZOOM_MIN, ZOOM_MAX)
  const k = zoom / (item.zoom ?? 1)
  const cx = px - (px - before.cx) * k
  const cy = py - (py - before.cy) * k
  const next = {
    ...item,
    zoom,
    offsetX: (cx - rect.x - rect.w / 2) / rect.w,
    offsetY: (cy - rect.y - rect.h / 2) / rect.h,
  }
  return { zoom, ...clampOffsets(image, rect, next) }
}

// --- Freies Gestalten: Magnet und Raster -----------------------------------

/**
 * Magnet („Snapping“).
 *
 * Beim Verschieben rasten Kanten und Mitte eines Elements an markanten
 * Linien ein: an den Rändern und der Mitte der Slide, an den Kanten der
 * anderen Elemente und – wenn eingeschaltet – an den Spalten des Rasters.
 * Zurück kommt das eingerastete Rechteck plus die Linien, die dabei
 * getroffen wurden (für die Hilfslinien in der Vorschau).
 *
 * @returns {{rect:object, guides:Array<{axis:'x'|'y', at:number}>}}
 */
export function snapRect(rect, others, { threshold = 0.007, columns = null } = {}) {
  const xTargets = [0, 0.5, 1]
  const yTargets = [0, 0.5, 1]

  others.forEach((o) => {
    xTargets.push(o.x, o.x + o.w / 2, o.x + o.w)
    yTargets.push(o.y, o.y + o.h / 2, o.y + o.h)
  })

  if (columns) {
    const { count, margin, gutter } = columns
    const usable = 1 - 2 * margin
    const width = (usable - gutter * (count - 1)) / count
    for (let i = 0; i < count; i++) {
      const start = margin + i * (width + gutter)
      xTargets.push(start, start + width)
    }
  }

  /** Sucht die kleinste Verschiebung, die eine Kante auf eine Linie legt. */
  const findSnap = (positions, targets) => {
    let best = null
    for (const position of positions) {
      for (const target of targets) {
        const distance = Math.abs(position - target)
        if (distance <= threshold && (!best || distance < best.distance)) {
          best = { distance, shift: target - position, at: target }
        }
      }
    }
    return best
  }

  const x = findSnap([rect.x, rect.x + rect.w / 2, rect.x + rect.w], xTargets)
  const y = findSnap([rect.y, rect.y + rect.h / 2, rect.y + rect.h], yTargets)

  const guides = []
  if (x) guides.push({ axis: 'x', at: x.at })
  if (y) guides.push({ axis: 'y', at: y.at })

  return {
    rect: { ...rect, x: rect.x + (x?.shift ?? 0), y: rect.y + (y?.shift ?? 0) },
    guides,
  }
}

/** Standardraster im Magazin-Sinn: Aussenrand, Spalten, Spaltenabstand. */
export const DEFAULT_GRID = { on: false, count: 6, margin: 0.06, gutter: 0.02 }

/** Die Spalten des Rasters als Rechtecke (0..1) – zum Einzeichnen. */
export function gridColumns({ count, margin, gutter }) {
  const usable = 1 - 2 * margin
  const width = (usable - gutter * (count - 1)) / count
  return Array.from({ length: count }, (_, i) => ({
    x: margin + i * (width + gutter),
    w: width,
  }))
}
