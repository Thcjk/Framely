/**
 * Ausgabeformate.
 *
 * Zwei Welten:
 *  - SOCIAL_FORMATS: nur ein Seitenverhältnis (Pixel), z.B. für Instagram.
 *  - PRINT_FORMATS: physische Grösse in Millimetern -> daraus lässt sich
 *    die nötige Pixelzahl für eine bestimmte DPI-Zahl berechnen.
 *
 * `ratio` ist immer Breite / Höhe.
 */

export const SOCIAL_FORMATS = [
  { id: 'portrait45', label: 'Hochformat', sub: '4:5 · Carousel', ratio: 4 / 5, px: 1440 },
  { id: 'square', label: 'Quadrat', sub: '1:1 · Feed', ratio: 1, px: 1440 },
  { id: 'story', label: 'Story / Reel', sub: '9:16', ratio: 9 / 16, px: 1440 },
]

/** Druckformate in Millimetern (Hochformat-Notation: w < h). */
export const PRINT_FORMATS = [
  { id: '10x15', label: '10 × 15 cm', sub: 'Standardabzug', w: 100, h: 150 },
  { id: '13x18', label: '13 × 18 cm', sub: 'Abzug', w: 130, h: 180 },
  { id: '15x20', label: '15 × 20 cm', sub: 'Abzug', w: 150, h: 200 },
  { id: '20x30', label: '20 × 30 cm', sub: 'Klein-Poster', w: 200, h: 300 },
  { id: '30x30', label: '30 × 30 cm', sub: 'Quadrat', w: 300, h: 300 },
  { id: 'a4', label: 'A4', sub: '21 × 29.7 cm', w: 210, h: 297 },
  { id: 'a3', label: 'A3', sub: '29.7 × 42 cm', w: 297, h: 420 },
  { id: '40x60', label: '40 × 60 cm', sub: 'Poster', w: 400, h: 600 },
  { id: '50x70', label: '50 × 70 cm', sub: 'Poster', w: 500, h: 700 },
  { id: '70x100', label: '70 × 100 cm', sub: 'Grossformat', w: 700, h: 1000 },
]

export const MM_PER_INCH = 25.4

/** Empfohlene Druckauflösung. Darunter wird gewarnt. */
export const DPI_IDEAL = 300
export const DPI_MIN = 150

/**
 * Liefert das aktive Ausgabeformat eines Projekts als einheitliches Objekt.
 * @returns {{ratio:number, widthMm:number|null, heightMm:number|null, label:string}}
 */
export function resolveFormat(project) {
  if (project.format.mode === 'print') {
    const f = PRINT_FORMATS.find((p) => p.id === project.format.printId) ?? PRINT_FORMATS[0]
    const portrait = project.format.orientation !== 'landscape'
    const widthMm = portrait ? f.w : f.h
    const heightMm = portrait ? f.h : f.w
    return { ratio: widthMm / heightMm, widthMm, heightMm, label: f.label }
  }
  const f = SOCIAL_FORMATS.find((s) => s.id === project.format.socialId) ?? SOCIAL_FORMATS[0]
  return { ratio: f.ratio, widthMm: null, heightMm: null, label: `${f.label} ${f.sub}` }
}

/**
 * Pixelmasse für einen Export.
 * Im Druckmodus aus mm + DPI, sonst aus der gewünschten längeren Kante.
 */
export function outputPixels(project, { dpi = DPI_IDEAL, longEdge = 1440 } = {}) {
  const { ratio, widthMm, heightMm } = resolveFormat(project)
  if (widthMm && heightMm) {
    return {
      width: Math.round((widthMm / MM_PER_INCH) * dpi),
      height: Math.round((heightMm / MM_PER_INCH) * dpi),
    }
  }
  return ratio >= 1
    ? { width: Math.round(longEdge), height: Math.round(longEdge / ratio) }
    : { width: Math.round(longEdge * ratio), height: Math.round(longEdge) }
}
