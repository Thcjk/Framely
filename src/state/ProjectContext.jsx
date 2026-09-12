/**
 * Globaler Zustand der App.
 *
 * Enthält das aktuelle Projekt (ein Carousel aus Slides), die geladenen
 * Bilder und alle Aktionen, die daran etwas verändern. Gespeichert wird
 * automatisch in der IndexedDB; die id des zuletzt geöffneten Projekts
 * merkt sich localStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as db from '../lib/db.js'
import { importFiles, loadProjectImages } from '../lib/images.js'
import {
  activeSlide as findActiveSlide,
  addItem,
  createProject,
  deleteSlide,
  distributeImages,
  duplicateSlide,
  insertSlide,
  moveSlide,
  panoramaSuggestion,
  removeItem,
  reorderItem,
  slideIndex,
  spreadPanorama,
  uid,
  updateItem,
  updateSlide,
} from '../lib/project.js'
import { applyTemplate, makeSlide } from '../lib/slides.js'
import { frameDefaults } from '../lib/frames.js'
import { resolveFormat } from '../lib/formats.js'

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
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const saveTimer = useRef(null)
  const messageTimer = useRef(null)

  /** Kurze Rückmeldung am oberen Bildschirmrand. */
  const notify = useCallback((text) => {
    setMessage(text)
    window.clearTimeout(messageTimer.current)
    messageTimer.current = window.setTimeout(() => setMessage(''), 3200)
  }, [])

  const refreshLists = useCallback(async () => {
    const [all, imgs] = await Promise.all([db.listProjects(), db.listImages()])
    setProjects(all.map(({ id, name, updatedAt, slides }) => ({
      id,
      name,
      updatedAt,
      slideCount: slides?.length ?? 0,
    })))
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
        loaded = all.find((p) => Array.isArray(p.slides)) ?? createProject('Erste Serie')
      }
      if (!loaded.activeSlideId) loaded = { ...loaded, activeSlideId: loaded.slides[0].id }
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
  const imageKey = project
    ? project.slides
        .flatMap((s) => s.items.filter((i) => i.type === 'image').map((i) => i.imageId ?? '-'))
        .join('|')
    : ''
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
  }, [imageKey])

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
      const next = typeof patchOrFn === 'function' ? patchOrFn(current) : { ...current, ...patchOrFn }
      return { ...next, updatedAt: Date.now() }
    })
  }, [])

  const slide = project ? findActiveSlide(project) : null
  const index = project ? Math.max(0, slideIndex(project, slide?.id)) : 0

  // --- Slides --------------------------------------------------------------

  const selectSlide = useCallback((slideId) => {
    setSelectedItemId(null)
    update({ activeSlideId: slideId })
  }, [update])

  const addSlide = useCallback(
    (templateId = 'inset') => {
      setSelectedItemId(null)
      update((current) => insertSlide(current, templateId, current.activeSlideId))
    },
    [update],
  )

  const setTemplate = useCallback(
    (templateId) => {
      setSelectedItemId(null)
      update((current) =>
        updateSlide(current, current.activeSlideId, (s) => applyTemplate(s, templateId)),
      )
    },
    [update],
  )

  const setSlideBackground = useCallback(
    (background) => update((current) => updateSlide(current, current.activeSlideId, { background })),
    [update],
  )

  const copySlide = useCallback(
    (slideId) => update((current) => duplicateSlide(current, slideId ?? current.activeSlideId)),
    [update],
  )

  const removeSlide = useCallback(
    (slideId) => {
      setSelectedItemId(null)
      update((current) => deleteSlide(current, slideId ?? current.activeSlideId))
    },
    [update],
  )

  const shiftSlide = useCallback(
    (slideId, delta) => update((current) => moveSlide(current, slideId, delta)),
    [update],
  )

  // --- Elemente ------------------------------------------------------------

  const patchItem = useCallback(
    (itemId, patch) =>
      update((current) => updateItem(current, current.activeSlideId, itemId, patch)),
    [update],
  )

  const insertItem = useCallback(
    (item) => {
      update((current) => addItem(current, current.activeSlideId, item))
      setSelectedItemId(item.id)
    },
    [update],
  )

  const deleteItem = useCallback(
    (itemId) => {
      setSelectedItemId(null)
      update((current) => removeItem(current, current.activeSlideId, itemId))
    },
    [update],
  )

  const stackItem = useCallback(
    (itemId, direction) =>
      update((current) => reorderItem(current, current.activeSlideId, itemId, direction)),
    [update],
  )

  // --- Bilder --------------------------------------------------------------

  const placeImageId = useCallback(
    (imageId, itemId = null) => {
      update((current) => {
        const target =
          itemId ??
          findActiveSlide(current).items.find((i) => i.type === 'image' && !i.imageId)?.id ??
          findActiveSlide(current).items.find((i) => i.type === 'image')?.id
        if (!target) return current
        return updateItem(current, current.activeSlideId, target, {
          imageId,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
        })
      })
    },
    [update],
  )

  const addFiles = useCallback(
    async (fileList, targetItemId = null) => {
      setBusy(true)
      try {
        const records = await importFiles(fileList)
        if (!records.length) {
          notify('Keine Bilddateien gefunden.')
          return []
        }
        update((current) => {
          if (targetItemId) {
            let next = updateItem(current, current.activeSlideId, targetItemId, {
              imageId: records[0].id,
              zoom: 1,
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
            })
            const rest = records.slice(1).map((r) => r.id)
            return rest.length ? distributeImages(next, rest) : next
          }
          return distributeImages(current, records.map((r) => r.id))
        })
        await refreshLists()
        notify(`${records.length} Bild${records.length > 1 ? 'er' : ''} importiert.`)
        return records
      } finally {
        setBusy(false)
      }
    },
    [notify, refreshLists, update],
  )

  /** Ein Bild als Panorama über mehrere Slides verteilen. */
  const makePanorama = useCallback(
    (imageId, count) => {
      const image = images.get(imageId)
      const ratio = resolveFormat(project).ratio
      update((current) => spreadPanorama(current, imageId, image, ratio, count, current.activeSlideId))
      notify(`Panorama über ${count} Slides angelegt.`)
    },
    [images, notify, project, update],
  )

  const suggestPanorama = useCallback(
    (imageId) => panoramaSuggestion(images.get(imageId), project ? resolveFormat(project).ratio : 0.8),
    [images, project],
  )

  // --- Rahmen, Format, Metadaten -------------------------------------------

  const setFrameStyle = useCallback(
    (styleId, { itemId = null } = {}) => {
      const frame = frameDefaults(styleId, project?.frame)
      if (itemId) patchItem(itemId, { frame })
      else update((current) => ({ ...current, frame }))
    },
    [patchItem, project, update],
  )

  const patchFrame = useCallback(
    (patch, { itemId = null } = {}) => {
      if (itemId) {
        patchItem(itemId, (item) => ({ frame: { ...(item.frame ?? project.frame), ...patch } }))
      } else {
        update((current) => ({ ...current, frame: { ...current.frame, ...patch } }))
      }
    },
    [patchItem, project, update],
  )

  /** Den Rahmen des gewählten Bildes auf alle Bilder übertragen. */
  const applyFrameToAll = useCallback(
    (frame) =>
      update((current) => ({
        ...current,
        frame,
        slides: current.slides.map((s) => ({
          ...s,
          items: s.items.map((item) => (item.type === 'image' ? { ...item, frame: null } : item)),
        })),
      })),
    [update],
  )

  const patchFormat = useCallback(
    (patch) => update((current) => ({ ...current, format: { ...current.format, ...patch } })),
    [update],
  )

  const patchMeta = useCallback(
    (patch) => update((current) => ({ ...current, meta: { ...current.meta, ...patch } })),
    [update],
  )

  const rename = useCallback((name) => update({ name }), [update])

  // --- Projekte ------------------------------------------------------------

  const newProject = useCallback(async () => {
    const created = createProject(`Serie ${new Date().toLocaleDateString('de-CH')}`)
    created.activeSlideId = created.slides[0].id
    await db.saveProject(created)
    localStorage.setItem(LAST_PROJECT_KEY, created.id)
    setProject(created)
    setSelectedItemId(null)
    await refreshLists()
    notify('Neues Projekt angelegt.')
  }, [notify, refreshLists])

  const openProject = useCallback(
    async (id) => {
      const loaded = await db.loadProject(id)
      if (!loaded) return
      setProject({ ...loaded, activeSlideId: loaded.activeSlideId ?? loaded.slides[0].id })
      setSelectedItemId(null)
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
        slides: source.slides.map((s) => ({
          ...s,
          id: uid(),
          items: s.items.map((item) => ({ ...item, id: uid() })),
        })),
      }
      copy.activeSlideId = copy.slides[0].id
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
        const next = remaining[0] ?? createProject('Neue Serie')
        if (!remaining[0]) await db.saveProject(next)
        setProject({ ...next, activeSlideId: next.activeSlideId ?? next.slides[0].id })
        localStorage.setItem(LAST_PROJECT_KEY, next.id)
      }
      await refreshLists()
      notify('Projekt gelöscht.')
    },
    [notify, project, refreshLists],
  )

  const value = useMemo(
    () => ({
      project, slide, index, images, library, projects,
      selectedItemId, setSelectedItemId, message, notify, busy,
      update, selectSlide, addSlide, setTemplate, setSlideBackground, copySlide, removeSlide,
      shiftSlide, patchItem, insertItem, deleteItem, stackItem,
      addFiles, placeImageId, makePanorama, suggestPanorama,
      setFrameStyle, patchFrame, applyFrameToAll, patchFormat, patchMeta, rename,
      newProject, openProject, duplicateProject, removeProject, makeSlide,
    }),
    [
      project, slide, index, images, library, projects, selectedItemId, message, busy,
      notify, update, selectSlide, addSlide, setTemplate, setSlideBackground, copySlide,
      removeSlide, shiftSlide, patchItem, insertItem, deleteItem, stackItem, addFiles,
      placeImageId, makePanorama, suggestPanorama, setFrameStyle, patchFrame, applyFrameToAll,
      patchFormat, patchMeta, rename, newProject, openProject, duplicateProject, removeProject,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
