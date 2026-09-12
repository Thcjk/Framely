/**
 * Persistenz mit IndexedDB.
 *
 * Warum nicht localStorage? Fotos sind schnell mehrere Megabyte gross und
 * localStorage ist auf ~5 MB Text begrenzt. IndexedDB speichert Blobs
 * direkt und dauerhaft. Zwei Stores:
 *   - `projects`: kleine JSON-Objekte (siehe project.js)
 *   - `images`:   { id, blob, width, height, name }
 */

const DB_NAME = 'framely'
const DB_VERSION = 1
const STORE_PROJECTS = 'projects'
const STORE_IMAGES = 'images'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

/** Kapselt eine Transaktion in ein Promise. */
async function tx(storeName, mode, action) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = action(store)
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve(request?.result)
  })
}

export const saveProject = (project) =>
  tx(STORE_PROJECTS, 'readwrite', (s) => s.put(project))

export const loadProject = (id) => tx(STORE_PROJECTS, 'readonly', (s) => s.get(id))

export const deleteProject = (id) => tx(STORE_PROJECTS, 'readwrite', (s) => s.delete(id))

export const listProjects = async () => {
  const all = (await tx(STORE_PROJECTS, 'readonly', (s) => s.getAll())) ?? []
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const saveImage = (record) => tx(STORE_IMAGES, 'readwrite', (s) => s.put(record))

export const loadImage = (id) => tx(STORE_IMAGES, 'readonly', (s) => s.get(id))

export const listImages = async () =>
  (await tx(STORE_IMAGES, 'readonly', (s) => s.getAll())) ?? []

export const deleteImage = (id) => tx(STORE_IMAGES, 'readwrite', (s) => s.delete(id))

/**
 * Entfernt Bilder, die in keinem Projekt mehr vorkommen ("Garbage Collection").
 * Wird nach dem Löschen eines Projekts aufgerufen.
 */
export async function pruneImages() {
  const [projects, images] = await Promise.all([listProjects(), listImages()])
  const used = new Set()
  projects.forEach((project) =>
    (project.slides ?? []).forEach((slide) =>
      (slide.items ?? []).forEach((item) => item.imageId && used.add(item.imageId)),
    ),
  )
  const orphans = images.filter((img) => !used.has(img.id))
  await Promise.all(orphans.map((img) => deleteImage(img.id)))
  return orphans.length
}

/**
 * Bittet den Browser, die Daten dauerhaft zu behalten (sonst dürfen sie bei
 * Speicherdruck gelöscht werden). Funktioniert nicht in allen Browsern.
 */
export async function requestPersistence() {
  if (navigator.storage?.persist) {
    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  }
  return false
}
