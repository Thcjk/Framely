/**
 * Die Arbeitsfläche.
 *
 * Hier passiert die direkte Gestaltung:
 *   - Element ziehen  = verschieben
 *   - Ecke ziehen     = Grösse ändern
 *   - Modus „Ausschnitt“ (oder Alt-Taste) = Bild innerhalb des Elements
 *     verschieben; Mausrad / zwei Finger zoomen den Ausschnitt
 *
 * Gezeichnet wird mit `renderSlide` – exakt derselben Funktion wie beim
 * Export, damit die Vorschau verbindlich ist.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import { renderSlide, toPixels } from '../lib/render.js'
import {
  hitTest, handleAt, moveRect, resizeRect, panImage, zoomImage, itemPhotoRect,
  ZOOM_MAX, ZOOM_MIN,
} from '../lib/interact.js'
import { resolveFormat } from '../lib/formats.js'

export default function Stage() {
  const {
    project, slide, index, images, selectedItemId, setSelectedItemId,
    patchItem, addFiles, deleteItem, stackItem,
  } = useProject()

  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const pendingItem = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  const [box, setBox] = useState({ width: 0, height: 0 })
  const [cropMode, setCropMode] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const format = project ? resolveFormat(project) : null
  const total = project?.slides.length ?? 1
  const selected = slide?.items.find((i) => i.id === selectedItemId) ?? null

  // --- Verfügbaren Platz messen -------------------------------------------
  useLayoutEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const ratio = format?.ratio ?? 0.8
  let displayW = box.width
  let displayH = displayW / ratio
  if (displayH > box.height) {
    displayH = box.height
    displayW = displayH * ratio
  }
  displayW = Math.max(0, Math.floor(displayW))
  displayH = Math.max(0, Math.floor(displayH))

  // --- Zeichnen ------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !project || !slide || displayW === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = Math.round(displayW * dpr)
    const H = Math.round(displayH * dpr)
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }
    const ctx = canvas.getContext('2d')
    renderSlide(ctx, {
      project, slide, images, index, total, W, H,
      placeholders: true,
      selectedItemId,
    })

    // Anfasser des gewählten Elements zusätzlich einzeichnen (nur Vorschau).
    const item = slide.items.find((i) => i.id === selectedItemId)
    if (item) {
      const b = toPixels(item.rect, W, H)
      const s = 9 * dpr
      ctx.fillStyle = '#111111'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5 * dpr
      for (const [hx, hy] of [
        [b.x, b.y],
        [b.x + b.w, b.y],
        [b.x, b.y + b.h],
        [b.x + b.w, b.y + b.h],
      ]) {
        ctx.fillRect(hx - s / 2, hy - s / 2, s, s)
        ctx.strokeRect(hx - s / 2, hy - s / 2, s, s)
      }
    }
  }, [project, slide, images, index, total, selectedItemId, displayW, displayH])

  // --- Koordinaten eines Zeigers in Leinwand-Einheiten ---------------------
  const toCanvas = useCallback((event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }, [])

  const size = () => ({ W: canvasRef.current.width, H: canvasRef.current.height })

  const openFilePicker = (itemId) => {
    pendingItem.current = itemId
    fileInputRef.current?.click()
  }

  // --- Zeiger-Ereignisse ---------------------------------------------------
  const onPointerDown = (event) => {
    if (!slide) return
    const canvas = canvasRef.current
    canvas.setPointerCapture(event.pointerId)
    const point = toCanvas(event)
    pointers.current.set(event.pointerId, point)
    const { W, H } = size()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Zuerst prüfen: sitzt der Zeiger auf einem Anfasser des gewählten Elements?
    if (selected) {
      const handle = handleAt(toPixels(selected.rect, W, H), point.x, point.y, 12 * dpr)
      if (handle) {
        gesture.current = { type: 'resize', itemId: selected.id, handle, start: point, rect: selected.rect }
        return
      }
    }

    const hit = hitTest(slide, W, H, point.x, point.y)
    if (!hit) {
      setSelectedItemId(null)
      gesture.current = null
      return
    }
    setSelectedItemId(hit.item.id)

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        type: 'pinch',
        itemId: hit.item.id,
        distance: Math.hypot(a.x - b.x, a.y - b.y),
      }
      return
    }

    const crop = (cropMode || event.altKey) && hit.item.type === 'image' && hit.item.imageId
    gesture.current = {
      type: crop ? 'crop' : 'move',
      itemId: hit.item.id,
      start: point,
      last: point,
      rect: hit.item.rect,
    }
  }

  const onPointerMove = (event) => {
    if (!slide || !gesture.current) return
    const point = toCanvas(event)
    pointers.current.set(event.pointerId, point)
    const { W, H } = size()
    const g = gesture.current
    const item = slide.items.find((i) => i.id === g.itemId)
    if (!item) return

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const image = item.imageId ? images.get(item.imageId) : null
      if (image && g.distance > 0) {
        const rect = itemPhotoRect(item, project, W, H)
        patchItem(item.id, zoomImage(item, image, rect, distance / g.distance, (a.x + b.x) / 2, (a.y + b.y) / 2))
      }
      gesture.current = { ...g, distance }
      return
    }

    if (g.type === 'crop') {
      const image = images.get(item.imageId)
      if (!image) return
      const rect = itemPhotoRect(item, project, W, H)
      patchItem(item.id, panImage(item, image, rect, point.x - g.last.x, point.y - g.last.y))
      gesture.current = { ...g, last: point }
      return
    }

    const dx = (point.x - g.start.x) / W
    const dy = (point.y - g.start.y) / H

    if (g.type === 'move') {
      patchItem(item.id, { rect: moveRect(g.rect, dx, dy) })
      return
    }

    if (g.type === 'resize') {
      patchItem(item.id, { rect: resizeRect(g.rect, g.handle, dx, dy, event.shiftKey) })
    }
  }

  const endPointer = (event) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) gesture.current = null
  }

  const onWheel = (event) => {
    if (!slide) return
    const point = toCanvas(event)
    const { W, H } = size()
    const hit = hitTest(slide, W, H, point.x, point.y)
    if (!hit || hit.item.type !== 'image' || !hit.item.imageId) return
    event.preventDefault()
    const image = images.get(hit.item.imageId)
    if (!image) return
    const rect = itemPhotoRect(hit.item, project, W, H)
    patchItem(hit.item.id, zoomImage(hit.item, image, rect, Math.exp(-event.deltaY * 0.0015), point.x, point.y))
  }

  const onClick = (event) => {
    if (!slide || gesture.current?.moved) return
    const point = toCanvas(event)
    const { W, H } = size()
    const hit = hitTest(slide, W, H, point.x, point.y)
    if (hit?.item.type === 'image' && !hit.item.imageId) openFilePicker(hit.item.id)
  }

  // --- Dateien direkt auf ein Element ziehen -------------------------------
  const onDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    if (!slide) return
    const point = toCanvas(event)
    const { W, H } = size()
    const hit = hitTest(slide, W, H, point.x, point.y)
    const imageId = event.dataTransfer.getData('text/framely-image')
    if (imageId && hit?.item.type === 'image') {
      patchItem(hit.item.id, { imageId, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })
      setSelectedItemId(hit.item.id)
      return
    }
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files, hit?.item.type === 'image' ? hit.item.id : null)
    }
  }

  // --- Tastatur: Elemente feinjustieren und löschen ------------------------
  useEffect(() => {
    const onKey = (event) => {
      if (!selected) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteItem(selected.id)
        return
      }
      const step = event.shiftKey ? 0.02 : 0.004
      const moves = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }
      if (moves[event.key]) {
        event.preventDefault()
        const [dx, dy] = moves[event.key]
        patchItem(selected.id, { rect: moveRect(selected.rect, dx, dy) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, deleteItem, patchItem])

  const zoomBy = (factor) => {
    if (!selected?.imageId) return
    const { W, H } = size()
    const image = images.get(selected.imageId)
    const rect = itemPhotoRect(selected, project, W, H)
    patchItem(selected.id, zoomImage(selected, image, rect, factor, rect.x + rect.w / 2, rect.y + rect.h / 2))
  }

  return (
    <section className="stage">
      <div
        className={`stage__canvas-wrap${dragOver ? ' is-dragover' : ''}`}
        ref={wrapRef}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <canvas
          ref={canvasRef}
          className={`stage__canvas${cropMode ? ' is-crop' : ''}`}
          style={{ width: `${displayW}px`, height: `${displayH}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onWheel={onWheel}
          onClick={onClick}
        />
      </div>

      <div className="stage__bar">
        <span className="stage__info">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} ·{' '}
          {format?.label}
        </span>

        <div className="stage__tools">
          <button
            type="button"
            className={`btn btn--ghost${cropMode ? ' is-active' : ''}`}
            onClick={() => setCropMode((v) => !v)}
            title="Im Ausschnitt-Modus verschiebt das Ziehen das Bild innerhalb seines Rahmens (oder Alt-Taste halten)"
          >
            Ausschnitt
          </button>

          {selected && (
            <>
              {selected.type === 'image' && (
                <>
                  <button type="button" className="btn btn--ghost" onClick={() => openFilePicker(selected.id)}>
                    Bild wählen
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={!selected.imageId}
                    onClick={() => patchItem(selected.id, { rotation: ((selected.rotation ?? 0) + 90) % 360 })}
                  >
                    Drehen
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={!selected.imageId || (selected.zoom ?? 1) <= ZOOM_MIN}
                    onClick={() => zoomBy(1 / 1.2)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={!selected.imageId || (selected.zoom ?? 1) >= ZOOM_MAX}
                    onClick={() => zoomBy(1.2)}
                  >
                    +
                  </button>
                </>
              )}
              <button type="button" className="btn btn--ghost" onClick={() => stackItem(selected.id, 'front')}>
                Nach vorne
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => stackItem(selected.id, 'back')}>
                Nach hinten
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => deleteItem(selected.id)}>
                Löschen
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) addFiles(event.target.files, pendingItem.current)
          pendingItem.current = null
          event.target.value = ''
        }}
      />
    </section>
  )
}
