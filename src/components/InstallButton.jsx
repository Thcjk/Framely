/**
 * Installations-Hinweis (PWA).
 *
 * Chrome/Edge/Android feuern `beforeinstallprompt` – dann zeigen wir einen
 * Button, der den Installationsdialog öffnet. iOS/Safari kennt das Ereignis
 * nicht; dort blenden wir einmalig eine kurze Anleitung ein.
 */
import { useEffect, useState } from 'react'

const HINT_KEY = 'framely.installHintSeen'

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      setPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setPrompt(null))

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
    if (isIos && !standalone && !localStorage.getItem(HINT_KEY)) setIosHint(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (iosHint) {
    return (
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => {
          localStorage.setItem(HINT_KEY, '1')
          setIosHint(false)
          alert('Zum Installieren: Teilen-Symbol antippen → „Zum Home-Bildschirm“.')
        }}
      >
        Installieren
      </button>
    )
  }

  if (!prompt) return null

  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={async () => {
        prompt.prompt()
        await prompt.userChoice
        setPrompt(null)
      }}
    >
      Installieren
    </button>
  )
}
