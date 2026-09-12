/**
 * Slides und ihre Vorlagen (Magazin-Stil).
 *
 * Ein Projekt ist ein Instagram-Carousel: eine Folge von Slides. Jede Slide
 * enthält frei platzierte Elemente – Bilder und Text. Alle Positionen sind
 * relative Rechtecke (0..1) der Slide-Fläche, damit dieselbe Gestaltung in
 * der Vorschau und im 300-dpi-Export identisch aussieht.
 *
 * Die Vorlagen sind Startpunkte, keine Zwangsjacke: jedes Element lässt
 * sich danach frei verschieben, skalieren und stapeln.
 */

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const rect = (x, y, w, h) => ({ x, y, w, h })

/**
 * Typografische Rollen.
 * `size` ist ein Anteil der kürzeren Slide-Kante – so skaliert Schrift
 * automatisch mit dem Format. `tracking` ist Laufweite in em.
 */
export const TEXT_PRESETS = {
  display: { label: 'Display', size: 0.11, family: 'sans', weight: 700, tracking: -0.02, uppercase: true, lineHeight: 0.98, align: 'left' },
  title: { label: 'Titel', size: 0.062, family: 'sans', weight: 400, tracking: -0.01, uppercase: false, lineHeight: 1.1, align: 'left' },
  serifTitle: { label: 'Titel Serif', size: 0.062, family: 'serif', weight: 400, tracking: 0, uppercase: false, lineHeight: 1.12, align: 'left' },
  quote: { label: 'Zitat', size: 0.034, family: 'serif', weight: 400, tracking: 0, uppercase: false, lineHeight: 1.35, align: 'left' },
  label: { label: 'Label', size: 0.017, family: 'sans', weight: 500, tracking: 0.18, uppercase: true, lineHeight: 1.4, align: 'left' },
  body: { label: 'Fliesstext', size: 0.021, family: 'sans', weight: 400, tracking: 0, uppercase: false, lineHeight: 1.5, align: 'left' },
  credits: { label: 'Credits', size: 0.016, family: 'sans', weight: 400, tracking: 0.04, uppercase: false, lineHeight: 1.6, align: 'left' },
  caption: { label: 'Bildunterschrift', size: 0.0135, family: 'sans', weight: 400, tracking: 0.12, uppercase: true, lineHeight: 1.5, align: 'left' },
  micro: { label: 'Ecken-Marke', size: 0.0115, family: 'sans', weight: 500, tracking: 0.2, uppercase: true, lineHeight: 1.2, align: 'left' },
}

/** Rahmen je Bild – der weisse Rand aus den Magazin-Layouts. */
export const ITEM_FRAME_NONE = { style: 'none', width: 0, color: '#ffffff' }

export function makeImageItem(r, extra = {}) {
  return {
    id: uid(),
    type: 'image',
    imageId: null,
    rect: r,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    frame: null, // null = Projekt-Standard
    ...extra,
  }
}

export function makeTextItem(r, { preset = 'credits', text = '', auto = null, color = null, style = {} } = {}) {
  return {
    id: uid(),
    type: 'text',
    rect: r,
    text,
    preset,
    auto, // 'pageNumber' | 'credits' | 'series' | 'handle' | 'date' | 'location'
    color, // null = automatischer Kontrast zum Hintergrund
    style, // Abweichungen vom Preset (size, align, tracking, uppercase …)
  }
}

/** Farbfläche – z.B. die weisse Hälfte neben einem Vollbild. */
export function makeBlockItem(r, color = '#ffffff') {
  return { id: uid(), type: 'block', rect: r, color }
}

// --- Ecken-Marken: die kleine Typografie am Seitenrand ----------------------

export const markPageNumber = () =>
  makeTextItem(rect(0.045, 0.035, 0.3, 0.03), { preset: 'micro', auto: 'pageNumber' })

export const markCredits = () =>
  makeTextItem(rect(0.655, 0.935, 0.3, 0.03), {
    preset: 'micro',
    auto: 'credits',
    style: { align: 'right' },
  })

/** Hängt die Standard-Marken an eine Elementliste an. */
const withMarks = (items) => [...items, markPageNumber(), markCredits()]

// --- Vorlagen ---------------------------------------------------------------

/**
 * `slots` = Anzahl Bildplätze (für das Verteilen importierter Fotos).
 * `group` gruppiert die Vorlagen in der Seitenleiste.
 */
export const SLIDE_TEMPLATES = [
  // — Einzelbild —
  {
    id: 'full',
    label: 'Vollbild',
    group: 'Bild',
    slots: 1,
    build: () => [makeImageItem(rect(0, 0, 1, 1))],
  },
  {
    id: 'inset',
    label: 'Bild mit Rand',
    group: 'Bild',
    slots: 1,
    build: () => withMarks([makeImageItem(rect(0.08, 0.1, 0.84, 0.78))]),
  },
  {
    id: 'portrait-centre',
    label: 'Hochformat zentriert',
    group: 'Bild',
    slots: 1,
    build: () => withMarks([makeImageItem(rect(0.26, 0.1, 0.48, 0.72))]),
  },

  // — Splits: Vollbild neben Weissfläche —
  {
    id: 'split-right',
    label: 'Split · Bild rechts',
    group: 'Split',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0.5, 0, 0.5, 1)),
        makeImageItem(rect(0.12, 0.3, 0.26, 0.34)),
      ]),
  },
  {
    id: 'split-left',
    label: 'Split · Bild links',
    group: 'Split',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0, 0, 0.5, 1)),
        makeImageItem(rect(0.6, 0.42, 0.34, 0.3)),
      ]),
  },
  {
    id: 'split-top',
    label: 'Split · Bild oben',
    group: 'Split',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0, 0, 1, 0.52)),
        makeImageItem(rect(0.12, 0.62, 0.42, 0.26)),
      ]),
  },

  // — Mehrere Bilder, asymmetrisch —
  {
    id: 'offset-pair',
    label: 'Gross + klein',
    group: 'Mehrere',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0.06, 0.1, 0.58, 0.58)),
        makeImageItem(rect(0.44, 0.52, 0.44, 0.34)),
      ]),
  },
  {
    id: 'overlap',
    label: 'Überlappend',
    group: 'Mehrere',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0.08, 0.14, 0.5, 0.62)),
        makeImageItem(rect(0.46, 0.36, 0.42, 0.46)),
      ]),
  },
  {
    id: 'two-uneven',
    label: 'Zwei ungleich',
    group: 'Mehrere',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0.06, 0.14, 0.44, 0.68)),
        makeImageItem(rect(0.56, 0.3, 0.38, 0.4)),
      ]),
  },
  {
    id: 'three-row',
    label: 'Drei in Reihe',
    group: 'Mehrere',
    slots: 3,
    build: () =>
      withMarks([
        makeImageItem(rect(0.07, 0.28, 0.25, 0.44)),
        makeImageItem(rect(0.375, 0.28, 0.25, 0.44)),
        makeImageItem(rect(0.68, 0.28, 0.25, 0.44)),
      ]),
  },
  {
    id: 'three-stagger',
    label: 'Drei versetzt',
    group: 'Mehrere',
    slots: 3,
    build: () =>
      withMarks([
        makeImageItem(rect(0.05, 0.22, 0.29, 0.4)),
        makeImageItem(rect(0.37, 0.12, 0.33, 0.56)),
        makeImageItem(rect(0.73, 0.34, 0.22, 0.3)),
      ]),
  },
  {
    id: 'filmstrip',
    label: 'Streifen',
    group: 'Mehrere',
    slots: 4,
    build: () =>
      withMarks([
        makeImageItem(rect(0.05, 0.4, 0.21, 0.2)),
        makeImageItem(rect(0.28, 0.4, 0.21, 0.2)),
        makeImageItem(rect(0.51, 0.4, 0.21, 0.2)),
        makeImageItem(rect(0.74, 0.4, 0.21, 0.2)),
      ]),
  },
  {
    id: 'contact-6',
    label: 'Kontaktbogen 6',
    group: 'Mehrere',
    slots: 6,
    build: () =>
      withMarks(
        Array.from({ length: 6 }, (_, i) =>
          makeImageItem(rect(0.08 + (i % 3) * 0.29, 0.2 + Math.floor(i / 3) * 0.32, 0.26, 0.28)),
        ),
      ),
  },
  {
    id: 'contact-9',
    label: 'Kontaktbogen 9',
    group: 'Mehrere',
    slots: 9,
    build: () =>
      withMarks(
        Array.from({ length: 9 }, (_, i) =>
          makeImageItem(rect(0.08 + (i % 3) * 0.29, 0.14 + Math.floor(i / 3) * 0.25, 0.26, 0.22)),
        ),
      ),
  },

  // — Typografie —
  {
    id: 'cover-type',
    label: 'Cover · Typo',
    group: 'Typo',
    kind: 'cover',
    slots: 1,
    build: () => [
      makeTextItem(rect(0.08, 0.1, 0.84, 0.06), { preset: 'label', auto: 'series' }),
      makeTextItem(rect(0.08, 0.2, 0.84, 0.3), { preset: 'display', text: 'Titel\nder Serie' }),
      makeImageItem(rect(0.08, 0.56, 0.84, 0.3)),
      makeTextItem(rect(0.08, 0.9, 0.84, 0.04), { preset: 'micro', auto: 'handle' }),
    ],
  },
  {
    id: 'cover-image',
    label: 'Cover · Bild',
    group: 'Typo',
    kind: 'cover',
    slots: 1,
    build: () => [
      makeImageItem(rect(0, 0, 1, 1)),
      makeTextItem(rect(0.08, 0.76, 0.7, 0.05), { preset: 'label', auto: 'series' }),
      makeTextItem(rect(0.08, 0.82, 0.84, 0.12), { preset: 'title', text: 'Name der Serie' }),
    ],
  },
  {
    id: 'text-left',
    label: 'Text + Bild',
    group: 'Typo',
    slots: 1,
    build: () =>
      withMarks([
        makeTextItem(rect(0.06, 0.16, 0.28, 0.18), { preset: 'title', text: 'Kapitel' }),
        makeTextItem(rect(0.06, 0.4, 0.28, 0.3), { preset: 'body', text: 'Ein kurzer Text zur Serie.' }),
        makeImageItem(rect(0.42, 0.1, 0.52, 0.78)),
      ]),
  },
  {
    id: 'quote',
    label: 'Bild + Zitat',
    group: 'Typo',
    slots: 1,
    build: () =>
      withMarks([
        makeImageItem(rect(0.08, 0.1, 0.84, 0.54)),
        makeTextItem(rect(0.08, 0.72, 0.72, 0.16), { preset: 'quote', text: '„Zitat oder Gedanke.“' }),
      ]),
  },
  {
    id: 'info-dark',
    label: 'Infoseite',
    group: 'Typo',
    kind: 'outro',
    slots: 0,
    background: '#141414',
    build: () => [
      makeTextItem(rect(0.08, 0.62, 0.4, 0.04), { preset: 'label', auto: 'series' }),
      makeTextItem(rect(0.08, 0.7, 0.38, 0.04), { preset: 'micro', text: '● Information' }),
      makeTextItem(rect(0.08, 0.75, 0.38, 0.16), {
        preset: 'credits',
        text: 'Serie und Auswahl\nOrt, Datum',
      }),
      makeTextItem(rect(0.52, 0.7, 0.4, 0.04), { preset: 'micro', text: '● Credits' }),
      makeTextItem(rect(0.52, 0.75, 0.4, 0.16), { preset: 'credits', auto: 'credits' }),
      markPageNumber(),
    ],
  },
  {
    id: 'credits',
    label: 'Schluss / Credits',
    group: 'Typo',
    kind: 'outro',
    slots: 0,
    build: () =>
      withMarks([
        makeTextItem(rect(0.1, 0.18, 0.6, 0.05), { preset: 'label', text: 'Credits' }),
        makeTextItem(rect(0.1, 0.28, 0.8, 0.4), { preset: 'credits', auto: 'credits' }),
        makeTextItem(rect(0.1, 0.74, 0.8, 0.05), { preset: 'micro', auto: 'handle' }),
      ]),
  },
  // — Kopf- und Fusszeilen (Magazin-Rail) —
  {
    id: 'rail-triple',
    label: 'Rail · drei Bilder',
    group: 'Rail',
    slots: 3,
    background: '#f4f2ed',
    build: () => [
      makeTextItem(rect(0.05, 0.05, 0.12, 0.03), { preset: 'micro', auto: 'pageNumber' }),
      makeTextItem(rect(0.3, 0.05, 0.4, 0.03), { preset: 'micro', auto: 'series', style: { align: 'center' } }),
      makeTextItem(rect(0.83, 0.05, 0.12, 0.03), { preset: 'micro', auto: 'date', style: { align: 'right' } }),
      // Aussenbilder laufen bewusst über den Rand hinaus.
      makeImageItem(rect(-0.08, 0.26, 0.22, 0.4)),
      makeImageItem(rect(0.28, 0.22, 0.44, 0.48)),
      makeImageItem(rect(0.86, 0.26, 0.22, 0.4)),
      makeTextItem(rect(0.05, 0.78, 0.5, 0.08), { preset: 'caption', text: 'INSPO —\nCHRONIQUES DE L’ÉTÉ   [024]' }),
    ],
  },
  {
    id: 'rail-single',
    label: 'Rail · ein Bild',
    group: 'Rail',
    slots: 1,
    background: '#f4f2ed',
    build: () => [
      makeTextItem(rect(0.05, 0.05, 0.12, 0.03), { preset: 'micro', auto: 'pageNumber' }),
      makeTextItem(rect(0.3, 0.05, 0.4, 0.03), { preset: 'micro', auto: 'series', style: { align: 'center' } }),
      makeTextItem(rect(0.83, 0.05, 0.12, 0.03), { preset: 'micro', auto: 'date', style: { align: 'right' } }),
      makeImageItem(rect(0.16, 0.2, 0.68, 0.54)),
      makeTextItem(rect(0.16, 0.78, 0.6, 0.06), { preset: 'caption', text: 'Ort, Datum   [01]' }),
    ],
  },
  {
    id: 'rail-bleed-row',
    label: 'Rail · Streifen',
    group: 'Rail',
    slots: 4,
    build: () => [
      makeTextItem(rect(0.05, 0.06, 0.5, 0.03), { preset: 'micro', auto: 'series' }),
      makeImageItem(rect(-0.06, 0.34, 0.24, 0.3)),
      makeImageItem(rect(0.2, 0.34, 0.24, 0.3)),
      makeImageItem(rect(0.46, 0.34, 0.24, 0.3)),
      makeImageItem(rect(0.72, 0.34, 0.34, 0.3)),
      makeTextItem(rect(0.05, 0.88, 0.6, 0.04), { preset: 'micro', auto: 'credits' }),
    ],
  },

  // — Doppelseiten-Look —
  {
    id: 'spread-bleed',
    label: 'Seite · Bild + Block',
    group: 'Spread',
    slots: 3,
    build: () =>
      withMarks([
        makeImageItem(rect(0, 0, 0.5, 1)),
        makeImageItem(rect(0.57, 0.12, 0.36, 0.3)),
        makeImageItem(rect(0.57, 0.45, 0.36, 0.24)),
        makeTextItem(rect(0.57, 0.74, 0.36, 0.12), {
          preset: 'caption',
          text: 'FALL / WINTER\nCampaign by\nChairo & Tim',
        }),
      ]),
  },
  {
    id: 'spread-pair',
    label: 'Seite · Paar',
    group: 'Spread',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0.05, 0.16, 0.43, 0.56)),
        makeImageItem(rect(0.52, 0.16, 0.43, 0.56)),
        makeTextItem(rect(0.52, 0.75, 0.43, 0.08), { preset: 'caption', text: 'Look 01 — 02' }),
      ]),
  },
  {
    id: 'spread-text',
    label: 'Seite · Bild + Text',
    group: 'Spread',
    slots: 2,
    build: () =>
      withMarks([
        makeImageItem(rect(0.05, 0.12, 0.42, 0.5)),
        makeTextItem(rect(0.05, 0.66, 0.42, 0.06), { preset: 'label', text: 'Kapitel 01' }),
        makeTextItem(rect(0.05, 0.73, 0.42, 0.16), {
          preset: 'caption',
          text: 'Ein kurzer Text zur Serie: worum es geht, wo sie entstand, was sie zeigt.',
        }),
        makeImageItem(rect(0.53, 0.28, 0.42, 0.5)),
      ]),
  },

  // — Index, Streuung, Kontaktbogen mit Beschriftung —
  {
    id: 'scatter',
    label: 'Streuung nummeriert',
    group: 'Index',
    slots: 6,
    background: '#f4f2ed',
    build: () => {
      const spots = [
        [0.09, 0.16, 0.2, 0.17],
        [0.63, 0.1, 0.24, 0.16],
        [0.79, 0.36, 0.17, 0.14],
        [0.35, 0.4, 0.26, 0.19],
        [0.05, 0.47, 0.15, 0.12],
        [0.42, 0.71, 0.23, 0.15],
      ]
      const items = []
      spots.forEach(([x, y, w, h], i) => {
        items.push(makeImageItem(rect(x, y, w, h)))
        items.push(
          makeTextItem(rect(x, y + h + 0.012, 0.2, 0.025), {
            preset: 'micro',
            text: `(0${i + 1})`,
          }),
        )
      })
      return [...items, markPageNumber(), markCredits()]
    },
  },
  {
    id: 'index-captions',
    label: 'Index mit Text',
    group: 'Index',
    slots: 6,
    background: '#f4f2ed',
    build: () => {
      const spots = [
        [0.06, 0.2, 0.18, 0.2],
        [0.27, 0.16, 0.2, 0.24],
        [0.5, 0.22, 0.17, 0.18],
        [0.7, 0.18, 0.24, 0.22],
        [0.1, 0.55, 0.24, 0.22],
        [0.38, 0.58, 0.2, 0.19],
      ]
      const items = [
        makeTextItem(rect(0.06, 0.07, 0.5, 0.03), { preset: 'micro', text: 'Index' }),
        makeTextItem(rect(0.62, 0.07, 0.32, 0.03), { preset: 'micro', auto: 'series', style: { align: 'right' } }),
      ]
      spots.forEach(([x, y, w, h], i) => {
        items.push(makeImageItem(rect(x, y, w, h)))
        items.push(
          makeTextItem(rect(x, y + h + 0.01, w + 0.08, 0.03), {
            preset: 'micro',
            text: `Motiv ${String(i + 1).padStart(3, '0')}`,
          }),
        )
      })
      return [...items, markCredits()]
    },
  },
  {
    id: 'mosaic',
    label: 'Mosaik dicht',
    group: 'Index',
    slots: 8,
    build: () =>
      withMarks([
        makeImageItem(rect(0.06, 0.12, 0.3, 0.26)),
        makeImageItem(rect(0.37, 0.12, 0.18, 0.16)),
        makeImageItem(rect(0.56, 0.12, 0.18, 0.16)),
        makeImageItem(rect(0.75, 0.12, 0.19, 0.26)),
        makeImageItem(rect(0.37, 0.29, 0.37, 0.19)),
        makeImageItem(rect(0.06, 0.39, 0.22, 0.22)),
        makeImageItem(rect(0.29, 0.49, 0.3, 0.26)),
        makeImageItem(rect(0.6, 0.49, 0.34, 0.26)),
      ]),
  },
  {
    id: 'contents',
    label: 'Inhalt',
    group: 'Index',
    slots: 4,
    build: () => [
      makeTextItem(rect(0.06, 0.08, 0.3, 0.04), { preset: 'label', text: 'Contents' }),
      makeTextItem(rect(0.56, 0.08, 0.38, 0.14), {
        preset: 'caption',
        text: '01  Einleitung\n02  Serie\n03  Credits',
        style: { align: 'right' },
      }),
      ...[0, 1, 2, 3].map((i) =>
        makeImageItem(rect(0.06 + i * 0.23, 0.32, 0.2, 0.28)),
      ),
      ...[0, 1, 2, 3].map((i) =>
        makeTextItem(rect(0.06 + i * 0.23, 0.62, 0.2, 0.05), {
          preset: 'micro',
          text: `0${i + 1} — Kapitel`,
        }),
      ),
      markCredits(),
    ],
  },
  {
    id: 'dark-index',
    label: 'Index dunkel',
    group: 'Index',
    slots: 0,
    background: '#141414',
    build: () => [
      makeTextItem(rect(0.06, 0.1, 0.4, 0.04), { preset: 'label', auto: 'series' }),
      ...[0, 1].flatMap((col) =>
        [0, 1].map((row) =>
          makeTextItem(rect(0.06 + col * 0.46, 0.3 + row * 0.22, 0.4, 0.18), {
            preset: 'caption',
            text: '2024\nProjekt, Ort\nRolle und Beitrag',
          }),
        ),
      ),
      markPageNumber(),
      markCredits(),
    ],
  },

  // — Moodboard —
  {
    id: 'moodboard',
    label: 'Moodboard',
    group: 'Index',
    slots: 4,
    background: '#f4f2ed',
    build: () => [
      makeTextItem(rect(0.06, 0.07, 0.6, 0.05), { preset: 'title', text: 'Moodboard' }),
      makeTextItem(rect(0.06, 0.17, 0.3, 0.03), { preset: 'micro', text: 'Fotos' }),
      makeImageItem(rect(0.06, 0.21, 0.26, 0.22)),
      makeImageItem(rect(0.34, 0.21, 0.22, 0.22)),
      makeTextItem(rect(0.6, 0.17, 0.34, 0.03), { preset: 'micro', text: 'Farben' }),
      ...['#efeee8', '#282828', '#ba3f1e', '#7a7f63'].map((color, i) =>
        makeBlockItem(rect(0.6 + i * 0.09, 0.21, 0.08, 0.07), color),
      ),
      makeTextItem(rect(0.6, 0.31, 0.34, 0.1), {
        preset: 'caption',
        text: '#efeee8\n#282828\n#ba3f1e',
      }),
      makeTextItem(rect(0.06, 0.5, 0.3, 0.03), { preset: 'micro', text: 'Textur' }),
      makeImageItem(rect(0.06, 0.54, 0.4, 0.2)),
      makeTextItem(rect(0.52, 0.5, 0.42, 0.03), { preset: 'micro', text: 'Typografie' }),
      makeTextItem(rect(0.52, 0.55, 0.42, 0.12), {
        preset: 'caption',
        text: 'Helvetica Neue\nGeorgia\nViel Weissraum, ruhige Achsen',
        style: { uppercase: false },
      }),
      makeTextItem(rect(0.06, 0.76, 0.3, 0.03), { preset: 'micro', text: 'Elemente' }),
      makeImageItem(rect(0.06, 0.8, 0.2, 0.12)),
      makeImageItem(rect(0.28, 0.8, 0.2, 0.12)),
      makeTextItem(rect(0.52, 0.76, 0.42, 0.16), {
        preset: 'quote',
        text: '„Ruhig, dokumentarisch, nah.“',
      }),
      markCredits(),
    ],
  },

  // — Freies Gestalten —
  {
    id: 'free',
    label: 'Frei · leer',
    group: 'Frei',
    slots: 0,
    build: () => [],
  },
  {
    id: 'free-marks',
    label: 'Frei · mit Marken',
    group: 'Frei',
    slots: 0,
    build: () => withMarks([]),
  },
  {
    id: 'free-start',
    label: 'Frei · ein Bild',
    group: 'Frei',
    slots: 1,
    build: () => withMarks([makeImageItem(rect(0.2, 0.26, 0.5, 0.42))]),
  },
]

export const TEMPLATE_GROUPS = ['Bild', 'Split', 'Mehrere', 'Rail', 'Spread', 'Index', 'Typo', 'Frei']

/** Klartext-Namen der Gruppen für die Oberfläche. */
export const GROUP_LABELS = {
  Bild: 'Einzelbild',
  Split: 'Halb / Halb',
  Mehrere: 'Mehrere',
  Rail: 'Kopfzeile',
  Spread: 'Doppelseite',
  Index: 'Index',
  Typo: 'Typografie',
  Frei: 'Frei',
}

export function getTemplate(id) {
  return SLIDE_TEMPLATES.find((t) => t.id === id) ?? SLIDE_TEMPLATES[0]
}

/** Erzeugt eine neue Slide aus einer Vorlage. */
export function makeSlide(templateId = 'inset', { background } = {}) {
  const template = getTemplate(templateId)
  return {
    id: uid(),
    templateId,
    kind: template.kind ?? 'page',
    // Bringt die Vorlage eine eigene Hintergrundfarbe mit (z.B. die dunkle
    // Infoseite), hat sie Vorrang vor der übernommenen Farbe der Nachbarslide.
    background: template.background ?? background ?? '#ffffff',
    items: template.build(),
  }
}

/**
 * Wendet eine Vorlage auf eine bestehende Slide an.
 * Bereits platzierte Bilder wandern der Reihe nach in die neuen Plätze,
 * überzählige Bilder bleiben als frei platzierte Elemente erhalten.
 */
export function applyTemplate(slide, templateId) {
  const template = getTemplate(templateId)
  const previousImages = slide.items.filter((i) => i.type === 'image')

  let index = 0
  const items = template.build().map((item) => {
    if (item.type !== 'image') return item
    const old = previousImages[index++]
    if (!old) return item
    return {
      ...item,
      imageId: old.imageId,
      zoom: old.zoom,
      offsetX: old.offsetX,
      offsetY: old.offsetY,
      rotation: old.rotation,
      frame: old.frame,
    }
  })

  previousImages.slice(index).forEach((old, i) => {
    if (!old.imageId) return
    items.push({ ...old, id: uid(), rect: rect(0.58 - i * 0.04, 0.6 + i * 0.04, 0.3, 0.24) })
  })

  return {
    ...slide,
    templateId,
    kind: template.kind ?? 'page',
    background: template.background ?? slide.background,
    items,
  }
}
