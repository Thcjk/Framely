/**
 * Abschnitt „Format“: Seitenverhältnis für Social oder physisches Druckformat.
 * Sitzt im Panel „Serie“, weil das Format zur ganzen Serie gehört und nicht
 * zur einzelnen Slide.
 */
import { useProject } from '../../state/ProjectContext.jsx'
import { SOCIAL_FORMATS, PRINT_FORMATS } from '../../lib/formats.js'
import DpiNotice from '../DpiNotice.jsx'

export default function FormatSection() {
  const { project, patchFormat } = useProject()
  const { mode, socialId, printId, orientation } = project.format

  return (
    <>
      <div className="segmented">
        <button
          type="button"
          className={mode === 'social' ? 'is-active' : ''}
          onClick={() => patchFormat({ mode: 'social' })}
        >
          Social
        </button>
        <button
          type="button"
          className={mode === 'print' ? 'is-active' : ''}
          onClick={() => patchFormat({ mode: 'print' })}
        >
          Druck
        </button>
      </div>

      {mode === 'social' ? (
        <ul className="list">
          {SOCIAL_FORMATS.map((format) => (
            <li key={format.id}>
              <button
                type="button"
                className={`option${socialId === format.id ? ' is-active' : ''}`}
                onClick={() => patchFormat({ socialId: format.id })}
              >
                <span className="option__ratio" aria-hidden="true">
                  <span
                    style={{
                      aspectRatio: String(format.ratio),
                      width: format.ratio >= 1 ? '28px' : 'auto',
                      height: format.ratio >= 1 ? 'auto' : '28px',
                    }}
                  />
                </span>
                <span className="option__text">
                  <strong>{format.label}</strong>
                  <small>{format.sub}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="segmented segmented--small">
            <button
              type="button"
              className={orientation === 'portrait' ? 'is-active' : ''}
              onClick={() => patchFormat({ orientation: 'portrait' })}
            >
              Hoch
            </button>
            <button
              type="button"
              className={orientation === 'landscape' ? 'is-active' : ''}
              onClick={() => patchFormat({ orientation: 'landscape' })}
            >
              Quer
            </button>
          </div>

          <ul className="list">
            {PRINT_FORMATS.map((format) => (
              <li key={format.id}>
                <button
                  type="button"
                  className={`option${printId === format.id ? ' is-active' : ''}`}
                  onClick={() => patchFormat({ printId: format.id })}
                >
                  <span className="option__text">
                    <strong>{format.label}</strong>
                    <small>{format.sub}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <h3 className="label">Auflösung</h3>
          <DpiNotice />
        </>
      )}
    </>
  )
}
