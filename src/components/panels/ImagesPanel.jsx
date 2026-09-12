/** Panel „Bilder“: lokaler Import, Bibliothek, Panorama und Lightroom. */
import { useRef, useState } from 'react'
import { useProject } from '../../state/ProjectContext.jsx'
import Thumb from '../Thumb.jsx'
import LightroomSection from '../LightroomSection.jsx'

export default function ImagesPanel() {
  const { library, addFiles, placeImageId, busy, makePanorama, suggestPanorama, notify } = useProject()
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const [panoramaFor, setPanoramaFor] = useState(null)
  const [count, setCount] = useState(3)

  const openPanorama = (imageId) => {
    setPanoramaFor(imageId)
    setCount(suggestPanorama(imageId))
  }

  return (
    <div className="panel">
      <div
        className={`dropzone${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <strong>Fotos hierher ziehen</strong>
        <span>oder klicken zum Auswählen</span>
        <small>Die Bilder bleiben auf deinem Gerät.</small>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {busy && <p className="note">Bilder werden verarbeitet …</p>}

      <h3 className="label">Bibliothek</h3>
      {library.length === 0 ? (
        <p className="note">Noch keine Bilder importiert.</p>
      ) : (
        <ul className="grid grid--thumbs">
          {library.map((image) => (
            <li key={image.id}>
              <button
                type="button"
                className="thumb-button"
                title={`${image.name} · ${image.width} × ${image.height} px`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/framely-image', image.id)}
                onClick={() => {
                  placeImageId(image.id)
                  notify('Bild platziert.')
                }}
                onDoubleClick={() => openPanorama(image.id)}
              >
                <Thumb imageId={image.id} alt={image.name} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="note">
        Klick platziert das Bild im gewählten Element, Ziehen legt es direkt auf eine Stelle der
        Slide. Doppelklick öffnet das Panorama.
      </p>

      {panoramaFor && (
        <div className="inset-card">
          <h4 className="label">Panorama über mehrere Slides</h4>
          <p className="note">
            Das Bild läuft als durchgehender Streifen über mehrere Slides – beim Durchwischen im
            Feed entsteht ein fortlaufendes Bild.
          </p>
          <label className="field">
            <span className="label">Anzahl Slides · {count}</span>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                makePanorama(panoramaFor, count)
                setPanoramaFor(null)
              }}
            >
              Panorama anlegen
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPanoramaFor(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <LightroomSection />
    </div>
  )
}
