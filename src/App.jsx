/**
 * App-Gerüst: Kopfzeile, Slide-Leiste, Arbeitsfläche, Seitenleiste, Dialoge.
 */
import { useEffect, useState } from 'react'
import { useProject } from './state/ProjectContext.jsx'
import Stage from './components/Stage.jsx'
import SlideStrip from './components/SlideStrip.jsx'
import Sidebar from './components/Sidebar.jsx'
import InstallButton from './components/InstallButton.jsx'
import PrintOrderDialog from './components/PrintOrderDialog.jsx'
import { UPDATE_EVENT } from './lib/updates.js'

export default function App() {
  const { project, message, notify, rename, selectedItemId } = useProject()
  const [tab, setTab] = useState('slides')
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 860)
  const [printOpen, setPrintOpen] = useState(false)

  // Eine neue Version der App übernimmt gleich – kurz Bescheid geben,
  // damit der automatische Neustart nicht aus dem Nichts kommt.
  useEffect(() => {
    const onUpdate = () => notify('Neue Version – die App lädt sich gleich neu.')
    window.addEventListener(UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate)
  }, [notify])

  // Wird ein Element gewählt, direkt seine Einstellungen zeigen.
  useEffect(() => {
    if (selectedItemId) setTab('element')
  }, [selectedItemId])

  // Browser-Standard beim Fallenlassen von Dateien unterbinden
  // (sonst öffnet der Browser das Bild einfach in einem neuen Tab).
  useEffect(() => {
    const stop = (event) => event.preventDefault()
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [])

  if (!project) {
    return (
      <div className="boot">
        <span>Framely</span>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="logo" aria-hidden="true" />
          <span className="header__name">Framely</span>
        </div>

        <input
          className="header__title"
          value={project.name}
          onChange={(event) => rename(event.target.value)}
          aria-label="Projektname"
        />

        <div className="header__actions">
          <InstallButton />
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setTab('export')
              setPanelOpen(true)
            }}
          >
            Export
          </button>
        </div>
      </header>

      <main className="main">
        <div className="workspace">
          <Stage />
          <SlideStrip />
        </div>
        <Sidebar
          tab={tab}
          onTab={setTab}
          open={panelOpen}
          onToggle={() => setPanelOpen((v) => !v)}
          onOrderPrint={() => setPrintOpen(true)}
        />
      </main>

      {printOpen && <PrintOrderDialog onClose={() => setPrintOpen(false)} />}

      <div className="toast" role="status" aria-live="polite">
        {message && <span>{message}</span>}
      </div>
    </div>
  )
}
