/**
 * Export: einzelne Slide, alle Slides, oder ein mehrseitiges PDF.
 *
 * Gerendert wird immer mit derselben Funktion wie die Vorschau
 * (`renderSlide`), nur auf eine grössere Leinwand.
 */

import { renderSlide } from './render.js'
import { jpegsToPdf } from './pdf.js'
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
  return { width: Math.floor(width * factor), height: Math.floor(height * factor), reduced: true }
}

/** Zeichnet eine Slide in eine neue Canvas der gewünschten Grösse. */
export function renderToCanvas(project, slide, images, width, height, index, total) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  renderSlide(canvas.getContext('2d'), {
    project,
    slide,
    images,
    index,
    total,
    W: width,
    H: height,
    placeholders: false,
  })
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
 * Erzeugt die Exportdateien.
 *
 * @param {object} options
 * @param {'jpg'|'png'|'pdf'} options.type
 * @param {'current'|'all'} options.scope
 * @returns {Promise<{files:Array<{blob:Blob,filename:string}>, width:number, height:number, reduced:boolean}>}
 */
export async function exportProject(project, images, options) {
  const {
    type = 'jpg',
    scope = 'current',
    slideId = null,
    dpi = 300,
    longEdge = 1440,
    quality = 0.92,
  } = options

  const target = outputPixels(project, { dpi, longEdge })
  const { width, height, reduced } = limitSize(target.width, target.height)
  const total = project.slides.length
  const base = safeName(project.name)

  const chosen =
    scope === 'all'
      ? project.slides.map((slide, index) => ({ slide, index }))
      : [
          {
            slide: project.slides.find((s) => s.id === slideId) ?? project.slides[0],
            index: Math.max(0, project.slides.findIndex((s) => s.id === slideId)),
          },
        ]

  // --- PDF: alle gewählten Slides als Seiten ---
  if (type === 'pdf') {
    const format = resolveFormat(project)
    const widthMm = format.widthMm ?? (width / dpi) * MM_PER_INCH
    const heightMm = format.heightMm ?? (height / dpi) * MM_PER_INCH

    const pages = []
    for (const { slide, index } of chosen) {
      const canvas = renderToCanvas(project, slide, images, width, height, index, total)
      const jpeg = await toBlob(canvas, 'image/jpeg', quality)
      pages.push({ jpeg: new Uint8Array(await jpeg.arrayBuffer()), imgW: width, imgH: height })
    }
    const pdf = jpegsToPdf(pages, { widthMm, heightMm, title: project.name })
    return { files: [{ blob: pdf, filename: `${base}.pdf` }], width, height, reduced }
  }

  // --- Bilder ---
  const mime = type === 'png' ? 'image/png' : 'image/jpeg'
  const files = []
  for (const { slide, index } of chosen) {
    const canvas = renderToCanvas(project, slide, images, width, height, index, total)
    const blob = await toBlob(canvas, mime, type === 'png' ? undefined : quality)
    const number = String(index + 1).padStart(2, '0')
    files.push({
      blob,
      filename: scope === 'all' ? `${base}-${number}.${type}` : `${base}-${number}.${type}`,
    })
  }
  return { files, width, height, reduced }
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
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Mehrere Dateien nacheinander herunterladen.
 * Der kleine Abstand ist nötig, weil Browser sonst nur die erste Datei
 * durchlassen.
 */
export async function downloadAll(files) {
  for (const [i, file] of files.entries()) {
    download(file.blob, file.filename)
    if (i < files.length - 1) await new Promise((r) => setTimeout(r, 350))
  }
}

function safeName(name) {
  const cleaned = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/gi, '')
    .replace(/\s+/g, '-')
  return cleaned || 'framely'
}
