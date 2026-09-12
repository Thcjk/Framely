/**
 * App-Gerüst: Kopfzeile, Arbeitsfläche, Seitenleiste, Dialoge.
 */
import { useEffect, useState } from 'react'
import { useProject } from './state/ProjectContext.jsx'
import Stage from './components/Stage.jsx'
import Sidebar from './components/Sidebar.jsx'
import InstallButton from './components/InstallButton.jsx'
import PrintOrderDialog from './components/PrintOrderDialog.jsx'

export default function App() {
  const { project, message, rename } = useProject()
  const [tab, setTab] = useState('images')
  // Auf schmalen Bildschirmen startet die Leiste eingeklappt.
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 860)
  const [printOpen, setPrintOpen] = useState(false)

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
        <Stage />
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
