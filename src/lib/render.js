/**
 * Der Renderer.
 *
 * Es gibt bewusst nur EINE Zeichenfunktion: `renderSlide`. Sie wird für die
 * Bildschirmvorschau und für den Export in voller Auflösung benutzt. Weil
 * alle Masse relativ zur Leinwandgrösse sind, sieht der Export exakt so aus
 * wie die Vorschau (WYSIWYG).
 */

import { MM_PER_INCH } from './formats.js'
import { itemFrame } from './frames.js'
import { drawText, resolveStyle, resolveText, contrastColor } from './text.js'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Relatives Rechteck (0..1) in Pixel umrechnen. */
export const toPixels = (r, W, H) => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H })

/**
 * Das Foto-Rechteck innerhalb eines Bild-Elements.
 * Der Rahmen frisst Platz von aussen nach innen; beim Polaroid unten mehr.
 */
export function photoRect(box, frame) {
  const style = frame?.styleId ?? 'none'
  if (style === 'none' || style === 'hairline' || !frame?.width) return box
  const pad = Math.min((frame.width / 100) * Math.min(box.w, box.h), Math.min(box.w, box.h) * 0.45)
  const bottom = style === 'polaroid' ? pad * 2.6 : pad
  return {
    x: box.x + pad,
    y: box.y + pad,
    w: Math.max(1, box.w - 2 * pad),
    h: Math.max(1, box.h - pad - bottom),
  }
}

/**
 * Berechnet, wie ein Bild in seinem Rechteck liegt.
 * Grundlage ist "cover" (Rechteck vollständig gefüllt); `zoom` vergrössert
 * zusätzlich, `offsetX/offsetY` verschieben (in Anteilen der Rechteckgrösse).
 */
export function placeImage(image, rect, item) {
  const rotation = (((item.rotation ?? 0) % 360) + 360) % 360
  const swap = rotation === 90 || rotation === 270
  const iw = swap ? image.height : image.width
  const ih = swap ? image.width : image.height

  const cover = Math.max(rect.w / iw, rect.h / ih)
  const scale = cover * (item.zoom ?? 1)
  const dw = iw * scale
  const dh = ih * scale

  const maxX = Math.max(0, (dw - rect.w) / 2)
  const maxY = Math.max(0, (dh - rect.h) / 2)
  const tx = clamp((item.offsetX ?? 0) * rect.w, -maxX, maxX)
  const ty = clamp((item.offsetY ?? 0) * rect.h, -maxY, maxY)

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

/** Begrenzt offsetX/offsetY so, dass das Bild sein Rechteck immer ausfüllt. */
export function clampOffsets(image, rect, item) {
  const p = placeImage(image, rect, item)
  const maxX = Math.max(0, (p.dw - rect.w) / 2) / rect.w
  const maxY = Math.max(0, (p.dh - rect.h) / 2) / rect.h
  return {
    offsetX: clamp(item.offsetX ?? 0, -maxX, maxX),
    offsetY: clamp(item.offsetY ?? 0, -maxY, maxY),
  }
}

/**
 * Zeichnet eine Slide auf einen 2D-Context der Grösse W × H.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {object} options.project
 * @param {object} options.slide
 * @param {Map<string, HTMLImageElement>} options.images  imageId -> Bild
 * @param {number} options.index  Position der Slide (für "01/10")
 * @param {number} options.total
 * @param {boolean} [options.placeholders]  leere Plätze andeuten (nur Vorschau)
 * @param {string|null} [options.selectedItemId]
 */
export function renderSlide(ctx, { project, slide, images, index, total, W, H, placeholders = false, selectedItemId = null }) {
  const short = Math.min(W, H)
  const ink = contrastColor(slide.background)

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 1. Hintergrund der Slide
  ctx.fillStyle = slide.background
  ctx.fillRect(0, 0, W, H)

  for (const item of slide.items) {
    const box = toPixels(item.rect, W, H)

    if (item.type === 'block') {
      ctx.fillStyle = item.color
      ctx.fillRect(box.x, box.y, box.w, box.h)
      continue
    }

    if (item.type === 'text') {
      const style = resolveStyle(item)
      drawText(ctx, {
        text: resolveText(item, { project, index, total }),
        rect: box,
        style,
        color: item.color ?? ink,
        short,
      })
      if (placeholders && item.id === selectedItemId) outline(ctx, box, short, '#111111')
      continue
    }

    // --- Bild ---
    const frame = itemFrame(item, project)
    const photo = photoRect(box, frame)
    const image = item.imageId ? images.get(item.imageId) : null

    // Rahmenfläche (weisser Rand / Passepartout / Polaroid)
    if (frame.styleId !== 'none' && frame.styleId !== 'hairline' && frame.width > 0) {
      ctx.fillStyle = frame.color
      ctx.fillRect(box.x, box.y, box.w, box.h)
    }

    if (image) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(photo.x, photo.y, photo.w, photo.h)
      ctx.clip()
      const p = placeImage(image, photo, item)
      ctx.translate(p.cx, p.cy)
      if (p.rotation) ctx.rotate((p.rotation * Math.PI) / 180)
      const drawW = p.swap ? p.dh : p.dw
      const drawH = p.swap ? p.dw : p.dh
      ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    } else if (placeholders) {
      // Leerer Bildplatz – nur in der Vorschau, nie im Export.
      ctx.fillStyle = 'rgba(128,128,128,.12)'
      ctx.fillRect(photo.x, photo.y, photo.w, photo.h)
      ctx.strokeStyle = 'rgba(128,128,128,.5)'
      ctx.lineWidth = Math.max(1, short * 0.0018)
      ctx.setLineDash([short * 0.012, short * 0.012])
      ctx.strokeRect(photo.x, photo.y, photo.w, photo.h)
      ctx.setLineDash([])
      const s = Math.min(photo.w, photo.h) * 0.12
      ctx.beginPath()
      ctx.moveTo(photo.x + photo.w / 2 - s / 2, photo.y + photo.h / 2)
      ctx.lineTo(photo.x + photo.w / 2 + s / 2, photo.y + photo.h / 2)
      ctx.moveTo(photo.x + photo.w / 2, photo.y + photo.h / 2 - s / 2)
      ctx.lineTo(photo.x + photo.w / 2, photo.y + photo.h / 2 + s / 2)
      ctx.stroke()
    }

    // Linien der Rahmenstile
    if (frame.styleId === 'hairline') {
      ctx.strokeStyle = frame.line
      ctx.lineWidth = Math.max(1, short * 0.0022)
      ctx.strokeRect(photo.x, photo.y, photo.w, photo.h)
    }
    if (frame.styleId === 'passepartout') {
      const o = Math.max(2, (frame.width / 100) * Math.min(box.w, box.h) * 0.22)
      ctx.strokeStyle = frame.line
      ctx.lineWidth = Math.max(1, short * 0.0015)
      ctx.strokeRect(photo.x - o, photo.y - o, photo.w + 2 * o, photo.h + 2 * o)
    }

    if (placeholders && item.id === selectedItemId) outline(ctx, box, short, '#111111')
  }

  ctx.restore()
}

/** Auswahlrahmen (nur Vorschau). */
function outline(ctx, box, short, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1.5, short * 0.0028)
  ctx.setLineDash([short * 0.02, short * 0.014])
  ctx.strokeRect(box.x, box.y, box.w, box.h)
  ctx.restore()
}

/**
 * Effektive Auflösung je Bild in DPI – Grundlage für die Druckwarnung.
 * Unabhängig von der Referenzgrösse: es zählt nur, wie viele Quellpixel
 * auf einen Millimeter Papier fallen.
 */
export function computeDpi(project, slide, images, widthMm, heightMm) {
  const results = []
  if (!widthMm || !heightMm || !slide) return results
  const W = 1000
  const H = (W * heightMm) / widthMm

  slide.items.forEach((item) => {
    if (item.type !== 'image') return
    const image = item.imageId ? images.get(item.imageId) : null
    if (!image) return
    const photo = photoRect(toPixels(item.rect, W, H), itemFrame(item, project))
    const p = placeImage(image, photo, item)
    const pixelsPerMm = (p.density * W) / widthMm
    results.push({ itemId: item.id, dpi: pixelsPerMm * MM_PER_INCH })
  })
  return results
}
