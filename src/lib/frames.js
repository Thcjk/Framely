/**
 * Rahmen – gelten pro Bild.
 *
 * In den Magazin-Layouts hat oft ein Bild einen weissen Rand und ein
 * anderes läuft randlos. Darum sitzt der Rahmen am einzelnen Bild-Element.
 * `width` ist ein Prozentwert der kürzeren Kante des Bild-Elements, damit
 * der Rand bei grossen und kleinen Bildern gleich proportional wirkt.
 */

export const FRAME_STYLES = [
  { id: 'none', label: 'Ohne Rahmen', hint: 'Bild randlos.', defaults: { width: 0 } },
  { id: 'white', label: 'Weisser Rand', hint: 'Klassischer Fotorand.', defaults: { width: 7 } },
  {
    id: 'passepartout',
    label: 'Passepartout',
    hint: 'Breiter Rand mit feiner Innenlinie.',
    defaults: { width: 14, line: '#111111' },
  },
  { id: 'polaroid', label: 'Polaroid', hint: 'Unten breiterer Rand.', defaults: { width: 7 } },
  {
    id: 'hairline',
    label: 'Konturlinie',
    hint: 'Nur eine dünne Linie ums Bild.',
    defaults: { width: 0, line: '#111111' },
  },
]

export function getFrameStyle(id) {
  return FRAME_STYLES.find((f) => f.id === id) ?? FRAME_STYLES[0]
}

/** Erzeugt einen Rahmen-Zustand beim Stilwechsel. */
export function frameDefaults(styleId, previous = {}) {
  const style = getFrameStyle(styleId)
  return {
    styleId,
    width: style.defaults.width,
    color: previous.color ?? '#ffffff',
    line: style.defaults.line ?? previous.line ?? '#111111',
  }
}

/** Der wirksame Rahmen eines Bildes: eigener Rahmen oder Projekt-Standard. */
export const itemFrame = (item, project) => item.frame ?? project.frame
