/** Einstiegspunkt: React starten und den Service Worker registrieren. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { ProjectProvider } from './state/ProjectContext.jsx'
import './styles/app.css'

// Der Service Worker macht die App offline-fähig und aktualisiert sich selbst.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </StrictMode>,
)
