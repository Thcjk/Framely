/**
 * Datenmodell eines Projekts.
 *
 * Wichtig: Bilddaten liegen NICHT im Projekt, sondern separat in der
 * IndexedDB (siehe db.js). Das Projekt referenziert Bilder nur über ihre id.
 * Dadurch bleibt das Projekt ein kleines, gut serialisierbares JSON-Objekt.
 */

import { getLayout } from './layouts.js'
import { frameDefaults } from './frames.js'

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Ein leerer Bildplatz. */
export function emptySlot(rect = null) {
  return {
    id: uid(),
    imageId: null,
    rect, // nur im freien Layout benutzt
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  }
}

export function createProject(name = 'Neues Layout') {
  const layout = getLayout('grid-4')
  return {
    id: uid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    format: {
      mode: 'social', // 'social' | 'print'
      socialId: 'square',
      printId: '13x18',
      orientation: 'portrait',
    },
    layoutId: layout.id,
    frame: frameDefaults('white'),
    slots: layout.cells.map(() => emptySlot()),
  }
}

/**
 * Passt die Slot-Liste an ein neues Layout an: vorhandene Bilder bleiben
 * (in ihrer Reihenfolge) erhalten, fehlende Plätze werden ergänzt.
 */
export function applyLayout(project, layoutId) {
  const layout = getLayout(layoutId)
  const slots = layout.cells.map((cell, i) => {
    const previous = project.slots[i]
    const rect = layout.freeform ? (previous?.rect ?? cell) : null
    return previous ? { ...previous, rect } : emptySlot(rect)
  })
  return { ...project, layoutId, slots }
}

/** Fügt dem freien Layout einen weiteren Bildplatz hinzu. */
export function addFreeSlot(project) {
  const n = project.slots.length
  const offset = (n % 5) * 0.06
  return {
    ...project,
    slots: [...project.slots, emptySlot({ x: 0.1 + offset, y: 0.1 + offset, w: 0.45, h: 0.45 })],
  }
}

/** Verteilt neue Bilder der Reihe nach auf freie Plätze. */
export function fillEmptySlots(project, imageIds) {
  const queue = [...imageIds]
  const slots = project.slots.map((slot) => {
    if (slot.imageId || queue.length === 0) return slot
    return { ...slot, imageId: queue.shift(), zoom: 1, offsetX: 0, offsetY: 0 }
  })
  return { ...project, slots }
}

/** Kleine Hilfe: Slot im Projekt ersetzen. */
export function updateSlot(project, slotId, patch) {
  return {
    ...project,
    slots: project.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
  }
}
