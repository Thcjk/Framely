/**
 * Rahmenstile.
 *
 * `border` = Aussenrand, `gap` = Abstand zwischen den Bildern.
 * Beide Werte sind Prozent der kürzeren Kante der Arbeitsfläche, damit ein
 * Rahmen in jedem Format und in jeder Auflösung gleich aussieht.
 */

export const FRAME_STYLES = [
  {
    id: 'none',
    label: 'Ohne Rahmen',
    hint: 'Bilder randlos, direkt aneinander.',
    defaults: { border: 0, gap: 0 },
  },
  {
    id: 'white',
    label: 'Weisser Rand',
    hint: 'Klassischer Fotorand – Breite frei wählbar.',
    defaults: { border: 5, gap: 3 },
  },
  {
    id: 'passepartout',
    label: 'Passepartout',
    hint: 'Breiter Rand mit feiner Innenlinie.',
    defaults: { border: 11, gap: 6, line: '#111111' },
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    hint: 'Karte je Bild, unten breiter.',
    defaults: { border: 5, gap: 4, card: '#ffffff' },
  },
  {
    id: 'hairline',
    label: 'Konturlinie',
    hint: 'Nur eine dünne Linie um jedes Bild.',
    defaults: { border: 3, gap: 2.5, line: '#111111' },
  },
]

export function getFrameStyle(id) {
  return FRAME_STYLES.find((f) => f.id === id) ?? FRAME_STYLES[0]
}

/** Erzeugt den Rahmen-Zustand eines Projekts beim Stilwechsel. */
export function frameDefaults(styleId, previous = {}) {
  const style = getFrameStyle(styleId)
  return {
    styleId,
    background: previous.background ?? '#ffffff',
    line: style.defaults.line ?? '#111111',
    card: style.defaults.card ?? '#ffffff',
    border: style.defaults.border,
    gap: style.defaults.gap,
  }
}
