/**
 * Export: Bild (JPG/PNG) und PDF.
 *
 * Gerendert wird immer mit derselben Funktion wie die Vorschau
 * (`renderProject`), nur auf eine grössere Leinwand.
 */

import { renderProject } from './render.js'
import { jpegToPdf } from './pdf.js'
import { resolveFormat, outputPixels, MM_PER_INCH } from './formats.js'

/**
 * Browser begrenzen die Grösse einer Canvas (Safari deutlich stärker als
 * Chrome). Wir deckeln daher die Gesamtpixelzahl und reduzieren notfalls
 * die Auflösung – besser ein etwas kleinerer Export als gar keiner.
 */
export const MAX_CANVAS_PIXELS = 40_000_000

export function limitSize(width, height) {
  const pixels = width * height
  if (pixels <= MAX_CANVAS_PIXELS) return { width, height, reduced: false }
  const factor = Math.sqrt(MAX_CANVAS_PIXELS / pixels)
  return {
    width: Math.floor(width * factor),
    height: Math.floor(height * factor),
    reduced: true,
  }
}

/** Zeichnet das Projekt in eine neue Canvas der gewünschten Grösse. */
export function renderToCanvas(project, images, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  renderProject(ctx, project, images, width, height, { placeholders: false })
  return canvas
}

const toBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export fehlgeschlagen.'))),
      type,
      quality,
    )
  })

/**
 * Erzeugt die Exportdatei.
 * @param {object} options
 * @param {'jpg'|'png'|'pdf'} options.type
 * @param {number} options.dpi     nur im Druckmodus relevant
 * @param {number} options.longEdge nur im Social-Modus relevant
 * @param {number} options.quality  JPEG-Qualität 0..1
 * @returns {Promise<{blob:Blob, filename:string, width:number, height:number, reduced:boolean}>}
 */
export async function exportProject(project, images, options) {
  const { type = 'jpg', dpi = 300, longEdge = 1440, quality = 0.92 } = options
  const target = outputPixels(project, { dpi, longEdge })
  const { width, height, reduced } = limitSize(target.width, target.height)

  const canvas = renderToCanvas(project, images, width, height)
  const base = safeName(project.name)

  if (type === 'png') {
    return { blob: await toBlob(canvas, 'image/png'), filename: `${base}.png`, width, height, reduced }
  }

  const jpeg = await toBlob(canvas, 'image/jpeg', quality)

  if (type === 'pdf') {
    const format = resolveFormat(project)
    // Ohne Druckformat (Social-Modus) leiten wir die Seitengrösse aus den
    // Pixeln bei der gewählten DPI-Zahl ab.
    const widthMm = format.widthMm ?? (width / dpi) * MM_PER_INCH
    const heightMm = format.heightMm ?? (height / dpi) * MM_PER_INCH
    const bytes = new Uint8Array(await jpeg.arrayBuffer())
    const pdf = jpegToPdf(bytes, {
      widthMm,
      heightMm,
      imgW: width,
      imgH: height,
      title: project.name,
    })
    return { blob: pdf, filename: `${base}.pdf`, width, height, reduced }
  }

  return { blob: jpeg, filename: `${base}.jpg`, width, height, reduced }
}

/** Löst den Download im Browser aus. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Etwas warten, damit der Download sicher gestartet ist.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function safeName(name) {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/gi, '')
    .replace(/\s+/g, '-')
  return cleaned || 'framely-layout'
}
