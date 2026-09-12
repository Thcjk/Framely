/**
 * Hilfsfunktionen für die Maus-/Finger-Bedienung auf der Leinwand.
 */

import { geometry, photoRect, placeImage, clampOffsets } from './render.js'

/**
 * Findet die Zelle unter einem Punkt (Leinwand-Koordinaten).
 * Bei überlappenden Zellen (freies Layout) gewinnt die oberste.
 * @returns {{index:number, slot:object, cellRect:object, rect:object}|null}
 */
export function hitTest(project, W, H, x, y) {
  const { cells, short } = geometry(project, W, H)
  for (let i = cells.length - 1; i >= 0; i--) {
    const c = cells[i]
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      return {
        index: i,
        slot: project.slots[i],
        cellRect: c,
        rect: photoRect(c, project, short),
      }
    }
  }
  return null
}

export const ZOOM_MIN = 1
export const ZOOM_MAX = 6

/**
 * Zoomt ein Bild um `factor` und hält dabei den Punkt (px, py) unter dem
 * Finger/Cursor fest – so fühlt sich Zoomen natürlich an.
 */
export function zoomSlot(slot, image, rect, factor, px, py) {
  const before = placeImage(image, rect, slot)
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (slot.zoom ?? 1) * factor))
  const k = zoom / (slot.zoom ?? 1)

  // Neuer Bildmittelpunkt, damit (px,py) auf demselben Bildpunkt bleibt.
  const cx = px - (px - before.cx) * k
  const cy = py - (py - before.cy) * k

  const next = {
    ...slot,
    zoom,
    offsetX: (cx - rect.x - rect.w / 2) / rect.w,
    offsetY: (cy - rect.y - rect.h / 2) / rect.h,
  }
  return { ...next, ...clampOffsets(image, rect, next) }
}

/** Verschiebt das Bild innerhalb seiner Zelle. */
export function panSlot(slot, image, rect, dx, dy) {
  const next = {
    ...slot,
    offsetX: (slot.offsetX ?? 0) + dx / rect.w,
    offsetY: (slot.offsetY ?? 0) + dy / rect.h,
  }
  return { ...next, ...clampOffsets(image, rect, next) }
}

/** Begrenzt ein frei platziertes Zellen-Rechteck auf die Fläche 0..1. */
export function clampRect(rect) {
  const w = Math.min(1, Math.max(0.08, rect.w))
  const h = Math.min(1, Math.max(0.08, rect.h))
  return {
    x: Math.min(1 - w, Math.max(0, rect.x)),
    y: Math.min(1 - h, Math.max(0, rect.y)),
    w,
    h,
  }
}
