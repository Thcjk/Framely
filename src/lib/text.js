/**
 * Textsatz auf der Leinwand.
 *
 * Canvas kann von sich aus weder Zeilenumbrüche noch Laufweite (tracking)
 * noch vertikale Ausrichtung. Das erledigt diese Datei – einmal zentral,
 * damit Vorschau und Export identisch aussehen.
 */

import { TEXT_PRESETS } from './slides.js'

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const SERIF = 'Georgia, "Times New Roman", Times, serif'

/** Preset + individuelle Abweichungen zu einem fertigen Stil verrechnen. */
export function resolveStyle(item) {
  const preset = TEXT_PRESETS[item.preset] ?? TEXT_PRESETS.credits
  return { ...preset, ...(item.style ?? {}) }
}

/** Heller oder dunkler Text – je nach Hintergrund. */
export function contrastColor(background) {
  const hex = String(background ?? '#ffffff').replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  // Wahrgenommene Helligkeit (ITU-R BT.601)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

/** Den automatischen Inhalt eines Text-Elements bestimmen. */
export function resolveText(item, { project, index, total }) {
  if (!item.auto) return item.text ?? ''
  const meta = project.meta ?? {}
  switch (item.auto) {
    case 'pageNumber': {
      const pad = (n) => String(n).padStart(2, '0')
      if (meta.numbering === 'nn') return pad(index + 1)
      if (meta.numbering === 'n/n') return `${index + 1}/${total}`
      return `${pad(index + 1)}/${pad(total)}`
    }
    case 'credits':
      return meta.credits ?? ''
    case 'series':
      return meta.series ?? ''
    case 'handle':
      return meta.handle ?? ''
    case 'date':
      return meta.date ?? ''
    case 'location':
      return meta.location ?? ''
    default:
      return item.text ?? ''
  }
}

const fontString = (style, size) =>
  `${style.weight} ${size}px ${style.family === 'serif' ? SERIF : SANS}`

/** Unterstützt der Browser Laufweite direkt? (Chrome/Edge ja, ältere nicht) */
const nativeTracking = (ctx) => 'letterSpacing' in ctx

/** Breite eines Textstücks inklusive Laufweite. */
function measure(ctx, text, style, size) {
  const width = ctx.measureText(text).width
  return nativeTracking(ctx) ? width : width + text.length * style.tracking * size
}

/** Zerlegt den Text in Zeilen, die in `maxWidth` passen. */
export function layoutLines(ctx, text, style, size, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split('\n')) {
    if (paragraph === '') {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of paragraph.split(' ')) {
      const candidate = current ? `${current} ${word}` : word
      if (current && measure(ctx, candidate, style, size) > maxWidth) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    lines.push(current)
  }
  return lines
}

/** Zeichnet eine Zeile; bei fehlender Browser-Unterstützung Zeichen für Zeichen. */
function drawLine(ctx, text, x, y, style, size) {
  if (nativeTracking(ctx)) {
    ctx.fillText(text, x, y)
    return
  }
  let cursor = x
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + style.tracking * size
  }
}

/**
 * Zeichnet ein Text-Element in sein Rechteck.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{text:string, rect:object, style:object, color:string, short:number}} options
 */
export function drawText(ctx, { text, rect, style, color, short }) {
  const content = style.uppercase ? String(text).toUpperCase() : String(text)
  if (!content.trim()) return

  const size = style.size * short
  ctx.save()
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.font = fontString(style, size)
  if (nativeTracking(ctx)) ctx.letterSpacing = `${style.tracking}em`

  const lines = layoutLines(ctx, content, style, size, rect.w)
  const lineHeight = size * style.lineHeight
  const blockHeight = lines.length * lineHeight

  // Senkrechte Ausrichtung im Rechteck
  const valign = style.valign ?? 'top'
  let top = rect.y
  if (valign === 'middle') top = rect.y + (rect.h - blockHeight) / 2
  if (valign === 'bottom') top = rect.y + rect.h - blockHeight

  lines.forEach((line, i) => {
    const width = measure(ctx, line, style, size)
    let x = rect.x
    if (style.align === 'center') x = rect.x + (rect.w - width) / 2
    if (style.align === 'right') x = rect.x + rect.w - width
    // Grundlinie: Zeilenoberkante + ~0.78 der Schriftgrösse
    drawLine(ctx, line, x, top + i * lineHeight + size * 0.78, style, size)
  })

  ctx.restore()
}

/** Höhe, die ein Text tatsächlich braucht (für „Rahmen an Text anpassen“). */
export function measureTextHeight(ctx, { text, rect, style, short }) {
  const content = style.uppercase ? String(text).toUpperCase() : String(text)
  const size = style.size * short
  ctx.save()
  ctx.font = fontString(style, size)
  if (nativeTracking(ctx)) ctx.letterSpacing = `${style.tracking}em`
  const lines = layoutLines(ctx, content, style, size, rect.w)
  ctx.restore()
  return lines.length * size * style.lineHeight
}
