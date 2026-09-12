/** Einstiegspunkt: React starten und den Service Worker registrieren. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ProjectProvider } from './state/ProjectContext.jsx'
import { setupAutoUpdate } from './lib/updates.js'
import './styles/app.css'

// Macht die App offline-fähig und hält sie selbstständig aktuell.
setupAutoUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </StrictMode>,
)
