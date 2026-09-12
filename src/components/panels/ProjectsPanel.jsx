/** Panel „Projekte“: gespeicherte Layouts verwalten. */
import { useProject } from '../../state/ProjectContext.jsx'

export default function ProjectsPanel() {
  const { projects, project, openProject, duplicateProject, removeProject, newProject, rename } =
    useProject()

  return (
    <div className="panel">
      <label className="field">
        <span className="label">Name des Projekts</span>
        <input
          type="text"
          value={project.name}
          onChange={(e) => rename(e.target.value)}
          className="input"
        />
      </label>

      <button type="button" className="btn btn--primary" onClick={newProject}>
        Neues Projekt
      </button>

      <h3 className="label">Gespeichert</h3>
      <ul className="list">
        {projects.map((item) => (
          <li key={item.id}>
            <div className={`project${item.id === project.id ? ' is-active' : ''}`}>
              <button type="button" className="project__open" onClick={() => openProject(item.id)}>
                <strong>{item.name}</strong>
                <small>{new Date(item.updatedAt).toLocaleString('de-CH')}</small>
              </button>
              <div className="project__actions">
                <button type="button" onClick={() => duplicateProject(item.id)} title="Duplizieren">
                  ⧉
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`„${item.name}“ wirklich löschen?`)) removeProject(item.id)
                  }}
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="note">
        Projekte liegen in der Datenbank deines Browsers (IndexedDB) – ohne Konto, ohne Server.
        Löschst du die Browserdaten dieser Seite, sind sie weg.
      </p>
    </div>
  )
}
