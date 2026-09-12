/**
 * Der Renderer.
 *
 * Es gibt bewusst nur EINE Zeichenfunktion: `renderProject`. Sie wird sowohl
 * für die Bildschirmvorschau als auch für den Export in voller Auflösung
 * benutzt. Weil alle Masse relativ zur Leinwandgrösse berechnet werden,
 * sieht der Export exakt so aus wie die Vorschau (WYSIWYG).
 */

import { getLayout } from './layouts.js'
import { MM_PER_INCH } from './formats.js'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Die Zellen-Rechtecke (0..1) eines Projekts – aus der Vorlage oder frei gesetzt. */
export function projectCells(project) {
  const layout = getLayout(project.layoutId)
  return project.slots.map((slot, i) => {
    if (layout.freeform && slot.rect) return slot.rect
    return layout.cells[i] ?? layout.cells[layout.cells.length - 1]
  })
}

/**
 * Rechnet die relativen Zellen in Pixel-Rechtecke um und berücksichtigt
 * Aussenrand (border) und Abstand (gap).
 */
export function geometry(project, W, H) {
  const short = Math.min(W, H)
  const border = (project.frame.border / 100) * short
  const gap = (project.frame.gap / 100) * short
  const contentW = Math.max(1, W - 2 * border)
  const contentH = Math.max(1, H - 2 * border)

  const cells = projectCells(project).map((c) => {
    const x = border + c.x * contentW + gap / 2
    const y = border + c.y * contentH + gap / 2
    const w = Math.max(1, c.w * contentW - gap)
    const h = Math.max(1, c.h * contentH - gap)
    return { x, y, w, h }
  })

  return { cells, border, gap, short }
}

/** Beim Polaroid-Stil sitzt das Foto innerhalb der Karte – unten mit mehr Rand. */
export function photoRect(cellRect, project, short) {
  if (project.frame.styleId !== 'polaroid') return cellRect
  const pad = Math.min(
    (project.frame.border / 100) * short * 0.6,
    Math.min(cellRect.w, cellRect.h) * 0.22,
  )
  const bottom = pad * 2.6
  return {
    x: cellRect.x + pad,
    y: cellRect.y + pad,
    w: Math.max(1, cellRect.w - 2 * pad),
    h: Math.max(1, cellRect.h - pad - bottom),
  }
}

/**
 * Berechnet, wie ein Bild in seiner Zelle liegt.
 * Grundlage ist "cover" (Zelle vollständig gefüllt); `zoom` vergrössert
 * zusätzlich, `offsetX/offsetY` verschieben (in Anteilen der Zellengrösse).
 * Die Verschiebung wird so begrenzt, dass nie ein leerer Rand entsteht.
 */
export function placeImage(image, rect, slot) {
  const rotation = ((slot.rotation ?? 0) % 360 + 360) % 360
  const swap = rotation === 90 || rotation === 270
  const iw = swap ? image.height : image.width
  const ih = swap ? image.width : image.height

  const cover = Math.max(rect.w / iw, rect.h / ih)
  const scale = cover * (slot.zoom ?? 1)
  const dw = iw * scale
  const dh = ih * scale

  const maxX = Math.max(0, (dw - rect.w) / 2)
  const maxY = Math.max(0, (dh - rect.h) / 2)
  const tx = clamp((slot.offsetX ?? 0) * rect.w, -maxX, maxX)
  const ty = clamp((slot.offsetY ?? 0) * rect.h, -maxY, maxY)

  return {
    cx: rect.x + rect.w / 2 + tx,
    cy: rect.y + rect.h / 2 + ty,
    dw,
    dh,
    rotation,
    swap,
    /** Quellpixel pro Leinwand-Einheit – Basis für die DPI-Prüfung. */
    density: iw / dw,
  }
}

/** Begrenzt offsetX/offsetY so, dass das Bild die Zelle immer ausfüllt. */
export function clampOffsets(image, rect, slot) {
  const p = placeImage(image, rect, slot)
  const maxX = Math.max(0, (p.dw - rect.w) / 2) / rect.w
  const maxY = Math.max(0, (p.dh - rect.h) / 2) / rect.h
  return {
    offsetX: clamp(slot.offsetX ?? 0, -maxX, maxX),
    offsetY: clamp(slot.offsetY ?? 0, -maxY, maxY),
  }
}

/**
 * Zeichnet das komplette Projekt auf einen 2D-Context der Grösse W × H.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} project
 * @param {Map<string, HTMLImageElement|ImageBitmap>} images  imageId -> geladenes Bild
 * @param {number} W
 * @param {number} H
 * @param {{placeholders?: boolean, selectedSlotId?: string|null}} options
 */
export function renderProject(ctx, project, images, W, H, options = {}) {
  const { placeholders = false, selectedSlotId = null } = options
  const { cells, short } = geometry(project, W, H)
  const style = project.frame.styleId

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 1. Hintergrund (ist gleichzeitig die Rahmenfarbe)
  ctx.fillStyle = project.frame.background
  ctx.fillRect(0, 0, W, H)

  project.slots.forEach((slot, i) => {
    const cellRect = cells[i]
    if (!cellRect) return

    // 2. Polaroid-Karte
    if (style === 'polaroid') {
      ctx.fillStyle = project.frame.card
      ctx.fillRect(cellRect.x, cellRect.y, cellRect.w, cellRect.h)
    }

    const rect = photoRect(cellRect, project, short)
    const image = slot.imageId ? images.get(slot.imageId) : null

    // 3. Foto (auf die Zelle beschnitten)
    if (image) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(rect.x, rect.y, rect.w, rect.h)
      ctx.clip()
      const p = placeImage(image, rect, slot)
      ctx.translate(p.cx, p.cy)
      if (p.rotation) ctx.rotate((p.rotation * Math.PI) / 180)
      const drawW = p.swap ? p.dh : p.dw
      const drawH = p.swap ? p.dw : p.dh
      ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    } else if (placeholders) {
      // Leere Zelle nur in der Vorschau andeuten – nie im Export.
      ctx.fillStyle = '#f2f2f0'
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
      ctx.strokeStyle = '#d4d4d0'
      ctx.lineWidth = Math.max(1, short * 0.002)
      ctx.setLineDash([short * 0.012, short * 0.012])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
      const s = Math.min(rect.w, rect.h) * 0.1
      ctx.strokeStyle = '#a8a8a2'
      ctx.lineWidth = Math.max(1, short * 0.003)
      ctx.beginPath()
      ctx.moveTo(rect.x + rect.w / 2 - s / 2, rect.y + rect.h / 2)
      ctx.lineTo(rect.x + rect.w / 2 + s / 2, rect.y + rect.h / 2)
      ctx.moveTo(rect.x + rect.w / 2, rect.y + rect.h / 2 - s / 2)
      ctx.lineTo(rect.x + rect.w / 2, rect.y + rect.h / 2 + s / 2)
      ctx.stroke()
    }

    // 4. Linien der Rahmenstile
    if (style === 'hairline') {
      ctx.strokeStyle = project.frame.line
      ctx.lineWidth = Math.max(1, short * 0.0022)
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
    }
    if (style === 'passepartout') {
      const o = Math.max(2, (project.frame.border / 100) * short * 0.22)
      ctx.strokeStyle = project.frame.line
      ctx.lineWidth = Math.max(1, short * 0.0015)
      ctx.strokeRect(rect.x - o, rect.y - o, rect.w + 2 * o, rect.h + 2 * o)
    }

    // 5. Auswahl-Markierung (nur Vorschau)
    if (placeholders && slot.id === selectedSlotId) {
      ctx.strokeStyle = '#111111'
      ctx.lineWidth = Math.max(1.5, short * 0.003)
      ctx.strokeRect(
        cellRect.x - ctx.lineWidth / 2,
        cellRect.y - ctx.lineWidth / 2,
        cellRect.w + ctx.lineWidth,
        cellRect.h + ctx.lineWidth,
      )
    }
  })

  ctx.restore()
}

/**
 * Effektive Auflösung je Zelle in DPI – Grundlage für die Druckwarnung.
 *
 * Das Ergebnis ist unabhängig von der Referenzgrösse der Leinwand: es zählt
 * nur, wie viele Quellpixel auf einen Millimeter Papier fallen.
 *
 * @returns {Array<{slotId:string, dpi:number|null}>}
 */
export function computeDpi(project, images, widthMm, heightMm) {
  if (!widthMm || !heightMm) return project.slots.map((s) => ({ slotId: s.id, dpi: null }))
  const W = 1000
  const H = (W * heightMm) / widthMm
  const { cells, short } = geometry(project, W, H)

  return project.slots.map((slot, i) => {
    const image = slot.imageId ? images.get(slot.imageId) : null
    if (!image || !cells[i]) return { slotId: slot.id, dpi: null }
    const rect = photoRect(cells[i], project, short)
    const p = placeImage(image, rect, slot)
    // density = Quellpixel pro Leinwand-Einheit; W Einheiten entsprechen widthMm.
    const pixelsPerMm = (p.density * W) / widthMm
    return { slotId: slot.id, dpi: pixelsPerMm * MM_PER_INCH }
  })
}
