/**
 * Globaler Zustand der App.
 *
 * Enthält das aktuelle Projekt, die geladenen Bilder und alle Aktionen,
 * die es verändern. Gespeichert wird automatisch (debounced) in der
 * IndexedDB; die id des zuletzt geöffneten Projekts merkt sich localStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as db from '../lib/db.js'
import { importFiles, loadProjectImages } from '../lib/images.js'
import {
  addFreeSlot,
  applyLayout,
  createProject,
  emptySlot,
  fillEmptySlots,
  uid,
  updateSlot,
} from '../lib/project.js'
import { frameDefaults } from '../lib/frames.js'

const LAST_PROJECT_KEY = 'framely.lastProject'

const ProjectContext = createContext(null)

export function useProject() {
  const value = useContext(ProjectContext)
  if (!value) throw new Error('useProject muss innerhalb des ProjectProvider benutzt werden.')
  return value
}

export function ProjectProvider({ children }) {
  const [project, setProject] = useState(null)
  const [images, setImages] = useState(() => new Map())
  const [library, setLibrary] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const saveTimer = useRef(null)

  /** Kurze Rückmeldung unten am Bildschirm. */
  const notify = useCallback((text) => {
    setMessage(text)
    window.clearTimeout(notify._t)
    notify._t = window.setTimeout(() => setMessage(''), 2600)
  }, [])

  const refreshLists = useCallback(async () => {
    const [all, imgs] = await Promise.all([db.listProjects(), db.listImages()])
    setProjects(all.map(({ id, name, updatedAt, layoutId }) => ({ id, name, updatedAt, layoutId })))
    setLibrary(
      imgs
        .map(({ id, name, width, height, createdAt }) => ({ id, name, width, height, createdAt }))
        .sort((a, b) => b.createdAt - a.createdAt),
    )
  }, [])

  // --- Start: letztes Projekt laden oder ein neues anlegen -----------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      db.requestPersistence()
      const lastId = localStorage.getItem(LAST_PROJECT_KEY)
      let loaded = lastId ? await db.loadProject(lastId) : null
      if (!loaded) {
        const all = await db.listProjects()
        loaded = all[0] ?? createProject('Mein erstes Layout')
      }
      if (cancelled) return
      setProject(loaded)
      localStorage.setItem(LAST_PROJECT_KEY, loaded.id)
      await refreshLists()
    })()
    return () => {
      cancelled = true
    }
  }, [refreshLists])

  // --- Bilder des Projekts nachladen --------------------------------------
  const imageIdKey = project ? project.slots.map((s) => s.imageId ?? '-').join('|') : ''
  useEffect(() => {
    if (!project) return
    let cancelled = false
    loadProjectImages(project).then((map) => {
      if (!cancelled) setImages(map)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIdKey])

  // --- Automatisch speichern ----------------------------------------------
  useEffect(() => {
    if (!project) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      db.saveProject(project).then(refreshLists)
    }, 500)
    return () => window.clearTimeout(saveTimer.current)
  }, [project, refreshLists])

  /** Zentrale Änderungsfunktion: nimmt ein Patch-Objekt oder eine Funktion. */
  const update = useCallback((patchOrFn) => {
    setProject((current) => {
      if (!current) return current
      const patch = typeof patchOrFn === 'function' ? patchOrFn(current) : patchOrFn
      return { ...current, ...patch, updatedAt: Date.now() }
    })
  }, [])

  // --- Aktionen ------------------------------------------------------------

  const addFiles = useCallback(
    async (fileList, targetSlotId = null) => {
      setBusy(true)
      try {
        const records = await importFiles(fileList)
        if (!records.length) {
          notify('Keine Bilddateien gefunden.')
          return []
        }
        setProject((current) => {
          if (!current) return current
          let next = current
          if (targetSlotId) {
            next = updateSlot(next, targetSlotId, {
              imageId: records[0].id,
              zoom: 1,
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
            })
            const rest = records.slice(1).map((r) => r.id)
            if (rest.length) next = fillEmptySlots(next, rest)
          } else {
            next = fillEmptySlots(next, records.map((r) => r.id))
          }
          return { ...next, updatedAt: Date.now() }
        })
        await refreshLists()
        notify(`${records.length} Bild${records.length > 1 ? 'er' : ''} importiert.`)
        return records
      } finally {
        setBusy(false)
      }
    },
    [notify, refreshLists],
  )

  const assignImage = useCallback(
    (slotId, imageId) =>
      update((current) =>
        updateSlot(current, slotId, { imageId, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }),
      ),
    [update],
  )

  const patchSlot = useCallback(
    (slotId, patch) => update((current) => updateSlot(current, slotId, patch)),
    [update],
  )

  const clearSlot = useCallback(
    (slotId) => patchSlot(slotId, { imageId: null, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }),
    [patchSlot],
  )

  /** Tauscht die Bilder zweier Plätze (per Drag & Drop im Editor). */
  const swapSlots = useCallback(
    (aId, bId) =>
      update((current) => {
        const a = current.slots.find((s) => s.id === aId)
        const b = current.slots.find((s) => s.id === bId)
        if (!a || !b) return {}
        const swap = (slot, other) => ({
          ...slot,
          imageId: other.imageId,
          zoom: other.zoom,
          offsetX: other.offsetX,
          offsetY: other.offsetY,
          rotation: other.rotation,
        })
        return {
          slots: current.slots.map((s) =>
            s.id === aId ? swap(s, b) : s.id === bId ? swap(s, a) : s,
          ),
        }
      }),
    [update],
  )

  const setLayout = useCallback(
    (layoutId) => update((current) => applyLayout(current, layoutId)),
    [update],
  )

  const addSlot = useCallback(() => update((current) => addFreeSlot(current)), [update])

  const removeSlot = useCallback(
    (slotId) =>
      update((current) => ({
        slots:
          current.slots.length > 1
            ? current.slots.filter((s) => s.id !== slotId)
            : [emptySlot(current.slots[0].rect)],
      })),
    [update],
  )

  const setFrameStyle = useCallback(
    (styleId) =>
      update((current) => ({ frame: { ...frameDefaults(styleId, current.frame) } })),
    [update],
  )

  const patchFrame = useCallback(
    (patch) => update((current) => ({ frame: { ...current.frame, ...patch } })),
    [update],
  )

  const patchFormat = useCallback(
    (patch) => update((current) => ({ format: { ...current.format, ...patch } })),
    [update],
  )

  const rename = useCallback((name) => update({ name }), [update])

  const newProject = useCallback(async () => {
    const created = createProject(`Layout ${new Date().toLocaleDateString('de-CH')}`)
    await db.saveProject(created)
    localStorage.setItem(LAST_PROJECT_KEY, created.id)
    setProject(created)
    setSelectedSlotId(null)
    await refreshLists()
    notify('Neues Projekt angelegt.')
  }, [notify, refreshLists])

  const openProject = useCallback(
    async (id) => {
      const loaded = await db.loadProject(id)
      if (!loaded) return
      setProject(loaded)
      setSelectedSlotId(null)
      localStorage.setItem(LAST_PROJECT_KEY, id)
      notify(`„${loaded.name}“ geöffnet.`)
    },
    [notify],
  )

  const duplicateProject = useCallback(
    async (id) => {
      const source = await db.loadProject(id)
      if (!source) return
      const copy = {
        ...source,
        id: uid(),
        name: `${source.name} (Kopie)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        slots: source.slots.map((s) => ({ ...s, id: uid() })),
      }
      await db.saveProject(copy)
      await refreshLists()
      notify('Projekt dupliziert.')
    },
    [notify, refreshLists],
  )

  const removeProject = useCallback(
    async (id) => {
      await db.deleteProject(id)
      await db.pruneImages()
      const remaining = await db.listProjects()
      if (project?.id === id) {
        const next = remaining[0] ?? createProject('Neues Layout')
        if (!remaining[0]) await db.saveProject(next)
        setProject(next)
        localStorage.setItem(LAST_PROJECT_KEY, next.id)
      }
      await refreshLists()
      notify('Projekt gelöscht.')
    },
    [notify, project, refreshLists],
  )

  const value = useMemo(
    () => ({
      project,
      images,
      library,
      projects,
      selectedSlotId,
      setSelectedSlotId,
      message,
      notify,
      busy,
      update,
      addFiles,
      assignImage,
      patchSlot,
      clearSlot,
      swapSlots,
      setLayout,
      addSlot,
      removeSlot,
      setFrameStyle,
      patchFrame,
      patchFormat,
      rename,
      newProject,
      openProject,
      duplicateProject,
      removeProject,
    }),
    [
      project, images, library, projects, selectedSlotId, message, busy, notify, update,
      addFiles, assignImage, patchSlot, clearSlot, swapSlots, setLayout, addSlot, removeSlot,
      setFrameStyle, patchFrame, patchFormat, rename, newProject, openProject,
      duplicateProject, removeProject,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
