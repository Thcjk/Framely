/**
 * Startbildschirm ausblenden.
 *
 * Das Markup steht in index.html, damit es sofort sichtbar ist – noch bevor
 * React geladen hat. Diese Datei kümmert sich nur ums Verschwinden:
 *
 *   - Gezeigt wird er drei Sekunden, gerechnet ab dem Öffnen der Seite
 *     (nicht ab dem Moment, in dem React fertig ist). Lädt die App auf einem
 *     langsamen Gerät länger, wartet der Startbildschirm entsprechend kürzer
 *     – die Gesamtzeit bis zum Editor bleibt so gleich.
 *   - Antippen, Klicken oder Escape überspringt ihn.
 *   - Nach dem Ausblenden wird das Element entfernt, damit es keine
 *     Eingaben abfängt.
 */

export const SPLASH_MS = 3000
const FADE_MS = 450

export function hideSplashAfterDelay() {
  const splash = document.getElementById('splash')
  if (!splash) return

  let done = false

  const remove = () => {
    if (done) return
    done = true
    splash.classList.add('is-hidden')
    window.setTimeout(() => splash.remove(), FADE_MS)
    window.removeEventListener('keydown', onKey)
  }

  const onKey = (event) => {
    if (event.key === 'Escape' || event.key === 'Enter') remove()
  }

  // performance.now() zählt ab dem Laden der Seite – genau das brauchen wir.
  const remaining = Math.max(0, SPLASH_MS - performance.now())
  window.setTimeout(remove, remaining)

  splash.addEventListener('pointerdown', remove)
  window.addEventListener('keydown', onKey)
}
