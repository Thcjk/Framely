/**
 * Die Arbeitsfläche.
 *
 * Hier passiert die direkte Manipulation: ein Bild lässt sich innerhalb
 * seiner Zelle verschieben (Maus ziehen / Finger wischen) und zoomen
 * (Mausrad / zwei Finger). Gezeichnet wird mit `renderProject` – exakt
 * derselben Funktion wie beim Export.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProject } from '../state/ProjectContext.jsx'
import { renderProject, geometry, projectCells, photoRect } from '../lib/render.js'
import { hitTest, panSlot, zoomSlot, clampRect, ZOOM_MAX, ZOOM_MIN } from '../lib/interact.js'
import { resolveFormat } from '../lib/formats.js'
import { getLayout } from '../lib/layouts.js'

export default function Stage() {
  const {
    project, images, selectedSlotId, setSelectedSlotId,
    patchSlot, addFiles, clearSlot, swapSlots, addSlot, removeSlot, update,
  } = useProject()

  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const pendingSlot = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  const [box, setBox] = useState({ width: 0, height: 0 })
  const [editCells, setEditCells] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const layout = project ? getLayout(project.layoutId) : null
  const freeform = Boolean(layout?.freeform)
  const format = project ? resolveFormat(project) : null

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

  // Anzeigegrösse: Seitenverhältnis in den verfügbaren Platz einpassen.
  const ratio = format?.ratio ?? 1
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
    if (!canvas || !project || displayW === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = Math.round(displayW * dpr)
    const H = Math.round(displayH * dpr)
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }
    const ctx = canvas.getContext('2d')
    renderProject(ctx, project, images, W, H, { placeholders: true, selectedSlotId })

    // Griffe für das freie Layout zusätzlich einzeichnen (nur Vorschau).
    if (freeform && editCells) {
      const { cells } = geometry(project, W, H)
      cells.forEach((c, i) => {
        const active = project.slots[i]?.id === selectedSlotId
        ctx.strokeStyle = active ? '#111' : 'rgba(17,17,17,.35)'
        ctx.lineWidth = 1.5 * dpr
        ctx.strokeRect(c.x, c.y, c.w, c.h)
        const s = 16 * dpr
        ctx.fillStyle = active ? '#111' : 'rgba(17,17,17,.45)'
        ctx.fillRect(c.x + c.w - s, c.y + c.h - s, s, s)
      })
    }
  }, [project, images, selectedSlotId, displayW, displayH, freeform, editCells])

  // --- Koordinaten eines Zeigers in Leinwand-Einheiten ----------------------
  const toCanvas = useCallback((event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }, [])

  const canvasSize = () => {
    const canvas = canvasRef.current
    return { W: canvas.width, H: canvas.height }
  }

  const openFilePicker = (slotId) => {
    pendingSlot.current = slotId
    fileInputRef.current?.click()
  }

  // --- Zeiger-Ereignisse ---------------------------------------------------
  const onPointerDown = (event) => {
    if (!project) return
    const canvas = canvasRef.current
    canvas.setPointerCapture(event.pointerId)
    const point = toCanvas(event)
    pointers.current.set(event.pointerId, point)

    const { W, H } = canvasSize()
    const hit = hitTest(project, W, H, point.x, point.y)
    if (!hit) {
      setSelectedSlotId(null)
      gesture.current = null
      return
    }
    setSelectedSlotId(hit.slot.id)

    // Zwei Finger = Zoom-Geste
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        type: 'pinch',
        slotId: hit.slot.id,
        distance: Math.hypot(a.x - b.x, a.y - b.y),
      }
      return
    }

    if (freeform && editCells) {
      const cells = geometry(project, W, H).cells
      const c = cells[hit.index]
      const handle = 16 * Math.min(window.devicePixelRatio || 1, 2)
      const onHandle = point.x > c.x + c.w - handle && point.y > c.y + c.h - handle
      gesture.current = {
        type: onHandle ? 'resize' : 'move',
        slotId: hit.slot.id,
        index: hit.index,
        start: point,
        rect: projectCells(project)[hit.index],
      }
      return
    }

    gesture.current = { type: 'pan', slotId: hit.slot.id, last: point }
  }

  const onPointerMove = (event) => {
    if (!project || !gesture.current) return
    const point = toCanvas(event)
    pointers.current.set(event.pointerId, point)
    const { W, H } = canvasSize()
    const g = gesture.current
    const index = project.slots.findIndex((s) => s.id === g.slotId)
    if (index < 0) return
    const slot = project.slots[index]
    const { cells, short } = geometry(project, W, H)

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const image = slot.imageId ? images.get(slot.imageId) : null
      if (image && g.distance > 0) {
        const rect = photoRect(cells[index], project, short)
        const next = zoomSlot(slot, image, rect, distance / g.distance, (a.x + b.x) / 2, (a.y + b.y) / 2)
        patchSlot(slot.id, { zoom: next.zoom, offsetX: next.offsetX, offsetY: next.offsetY })
      }
      gesture.current = { ...g, distance }
      return
    }

    if (g.type === 'pan') {
      const image = slot.imageId ? images.get(slot.imageId) : null
      if (!image) return
      const rect = photoRect(cells[index], project, short)
      const next = panSlot(slot, image, rect, point.x - g.last.x, point.y - g.last.y)
      patchSlot(slot.id, { offsetX: next.offsetX, offsetY: next.offsetY })
      gesture.current = { ...g, last: point }
      return
    }

    if (g.type === 'move' || g.type === 'resize') {
      const dx = (point.x - g.start.x) / W
      const dy = (point.y - g.start.y) / H
      const base = g.rect
      const rect =
        g.type === 'move'
          ? { ...base, x: base.x + dx, y: base.y + dy }
          : { ...base, w: base.w + dx, h: base.h + dy }
      update((current) => ({
        slots: current.slots.map((s) => (s.id === g.slotId ? { ...s, rect: clampRect(rect) } : s)),
      }))
    }
  }

  const endPointer = (event) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) gesture.current = null
  }

  const onClick = (event) => {
    if (!project) return
    const point = toCanvas(event)
    const { W, H } = canvasSize()
    const hit = hitTest(project, W, H, point.x, point.y)
    if (hit && !hit.slot.imageId) openFilePicker(hit.slot.id)
  }

  const onWheel = (event) => {
    if (!project) return
    event.preventDefault()
    const point = toCanvas(event)
    const { W, H } = canvasSize()
    const hit = hitTest(project, W, H, point.x, point.y)
    if (!hit?.slot.imageId) return
    const image = images.get(hit.slot.imageId)
    if (!image) return
    const next = zoomSlot(hit.slot, image, hit.rect, Math.exp(-event.deltaY * 0.0015), point.x, point.y)
    patchSlot(hit.slot.id, { zoom: next.zoom, offsetX: next.offsetX, offsetY: next.offsetY })
  }

  // --- Dateien direkt auf eine Zelle ziehen --------------------------------
  const onDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    if (!project) return
    const point = toCanvas(event)
    const { W, H } = canvasSize()
    const hit = hitTest(project, W, H, point.x, point.y)
    const imageId = event.dataTransfer.getData('text/framely-image')
    if (imageId && hit) {
      patchSlot(hit.slot.id, { imageId, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })
      setSelectedSlotId(hit.slot.id)
      return
    }
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files, hit?.slot.id ?? null)
  }

  const selected = project?.slots.find((s) => s.id === selectedSlotId) ?? null
  const selectedIndex = project ? project.slots.findIndex((s) => s.id === selectedSlotId) : -1

  const zoomBy = (factor) => {
    if (!selected?.imageId || !project) return
    const { W, H } = canvasSize()
    const { cells, short } = geometry(project, W, H)
    const image = images.get(selected.imageId)
    const rect = photoRect(cells[selectedIndex], project, short)
    const next = zoomSlot(selected, image, rect, factor, rect.x + rect.w / 2, rect.y + rect.h / 2)
    patchSlot(selected.id, { zoom: next.zoom, offsetX: next.offsetX, offsetY: next.offsetY })
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
          className="stage__canvas"
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
          {format?.label}
          {format?.widthMm ? ` · ${format.widthMm} × ${format.heightMm} mm` : ''}
        </span>

        <div className="stage__tools">
          {freeform && (
            <>
              <button
                type="button"
                className={`btn btn--ghost${editCells ? ' is-active' : ''}`}
                onClick={() => setEditCells((v) => !v)}
              >
                Zellen bearbeiten
              </button>
              <button type="button" className="btn btn--ghost" onClick={addSlot}>
                + Zelle
              </button>
            </>
          )}

          {selected && (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => openFilePicker(selected.id)}>
                Bild wählen
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!selected.imageId}
                onClick={() => patchSlot(selected.id, { rotation: ((selected.rotation ?? 0) + 90) % 360 })}
                title="Um 90° drehen"
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
              <button
                type="button"
                className="btn btn--ghost"
                disabled={selectedIndex < 1}
                title="Bild nach vorne tauschen"
                onClick={() => swapSlots(selected.id, project.slots[selectedIndex - 1].id)}
              >
                ◀
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={selectedIndex < 0 || selectedIndex >= project.slots.length - 1}
                title="Bild nach hinten tauschen"
                onClick={() => swapSlots(selected.id, project.slots[selectedIndex + 1].id)}
              >
                ▶
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!selected.imageId}
                onClick={() => clearSlot(selected.id)}
              >
                Leeren
              </button>
              {freeform && (
                <button type="button" className="btn btn--ghost" onClick={() => removeSlot(selected.id)}>
                  Zelle löschen
                </button>
              )}
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
          if (event.target.files?.length) addFiles(event.target.files, pendingSlot.current)
          pendingSlot.current = null
          event.target.value = ''
        }}
      />
    </section>
  )
}
