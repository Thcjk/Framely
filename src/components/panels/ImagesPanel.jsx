/** Panel „Bilder“: Import per Drag & Drop oder Dateiauswahl. */
import { useRef, useState } from 'react'
import { useProject } from '../../state/ProjectContext.jsx'
import Thumb from '../Thumb.jsx'

export default function ImagesPanel() {
  const { library, addFiles, assignImage, selectedSlotId, project, busy, notify } = useProject()
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  /** Klick auf ein Bild: in den gewählten oder ersten freien Platz setzen. */
  const place = (imageId) => {
    const target =
      project.slots.find((s) => s.id === selectedSlotId) ??
      project.slots.find((s) => !s.imageId) ??
      project.slots[0]
    if (!target) return
    assignImage(target.id, imageId)
    notify('Bild platziert.')
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
                onClick={() => place(image.id)}
              >
                <Thumb imageId={image.id} alt={image.name} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="note">
        Tipp: Ein Bild aus der Bibliothek lässt sich direkt auf eine Zelle der Arbeitsfläche
        ziehen.
      </p>
    </div>
  )
}
