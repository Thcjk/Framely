/**
 * Panel „Serie“: die projektweiten Angaben.
 * Text-Elemente mit automatischem Inhalt (Seitenzahl, Credits, Serienname …)
 * greifen darauf zu – einmal ändern, überall aktuell.
 */
import { useProject } from '../../state/ProjectContext.jsx'

export default function SeriesPanel() {
  const { project, patchMeta, rename } = useProject()
  const meta = project.meta ?? {}

  const field = (key, label, placeholder = '') => (
    <label className="field">
      <span className="label">{label}</span>
      <input
        type="text"
        className="input"
        value={meta[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => patchMeta({ [key]: e.target.value })}
      />
    </label>
  )

  return (
    <div className="panel">
      <label className="field">
        <span className="label">Projektname</span>
        <input type="text" className="input" value={project.name} onChange={(e) => rename(e.target.value)} />
      </label>

      {field('series', 'Serienname', 'Serie 01')}
      {field('credits', 'Credits', 'Chairo & Tim')}
      {field('location', 'Ort')}
      {field('date', 'Datum')}
      {field('handle', 'Website / Handle')}

      <div className="field">
        <span className="label">Seitenzahlen</span>
        <div className="segmented segmented--small">
          {[
            ['nn/nn', '01/10'],
            ['n/n', '1/10'],
            ['nn', '01'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={meta.numbering === value ? 'is-active' : ''}
              onClick={() => patchMeta({ numbering: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="note">
        Diese Angaben erscheinen überall dort, wo ein Textelement auf „automatischer Inhalt“
        steht – etwa die Ecken-Marken oben links und unten rechts.
      </p>
    </div>
  )
}
