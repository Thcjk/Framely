/**
 * Automatische Updates der installierten App.
 *
 * Der Service Worker ist auf „autoUpdate“ gestellt: sobald der Browser eine
 * neue Version findet, übernimmt sie und die Seite lädt sich einmal neu.
 * Der Haken daran: von sich aus sucht der Browser nur beim Start der App
 * nach einer neuen Version (und danach höchstens etwa alle 24 Stunden).
 * Eine installierte PWA, die tagelang offen bleibt, bekommt ein Update also
 * gar nicht mit.
 *
 * Darum fragen wir hier aktiv nach:
 *   - regelmässig (stündlich)
 *   - wenn die App wieder in den Vordergrund kommt
 *   - wenn das Gerät wieder online ist
 *
 * Kurz bevor die neue Version übernimmt, meldet das Modul ein Ereignis
 * `framely:updating`. Die Oberfläche zeigt daraufhin einen Hinweis, und der
 * Projektzustand wird sofort gesichert – damit der Neustart nichts kostet.
 */

import { registerSW } from 'virtual:pwa-register'

const CHECK_INTERVAL = 60 * 60 * 1000 // stündlich
const MIN_GAP = 5 * 60 * 1000 // nicht öfter als alle 5 Minuten nachfragen

export const UPDATE_EVENT = 'framely:updating'

export function setupAutoUpdate() {
  let lastCheck = 0

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = async () => {
        if (!navigator.onLine) return
        if (Date.now() - lastCheck < MIN_GAP) return
        lastCheck = Date.now()
        try {
          await registration.update()
        } catch {
          // Offline oder Server nicht erreichbar – beim nächsten Mal wieder.
        }
      }

      /**
       * Eine neue Version wurde gefunden und ist fertig installiert.
       * `navigator.serviceWorker.controller` unterscheidet dabei das echte
       * Update von der allerersten Installation.
       */
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing || !navigator.serviceWorker.controller) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
          }
        })
      })

      window.setInterval(check, CHECK_INTERVAL)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('online', check)
      window.addEventListener('focus', check)
    },
  })
}
