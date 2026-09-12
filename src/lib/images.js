/**
 * Bild-Import und Bild-Cache.
 *
 * Ablauf beim Import:
 *   Datei -> <img> laden (EXIF-Drehung macht der Browser) -> ggf. verkleinern
 *   -> als Blob in die IndexedDB -> zur Laufzeit als <img> im Cache halten.
 *
 * Es verlässt nie ein Byte den Browser.
 */

import { saveImage, loadImage } from './db.js'
import { uid, usedImageIds } from './project.js'

/** Obergrenze der langen Kante. 5000 px reichen für 300 dpi auf ~42 cm. */
const MAX_EDGE = 5000

/** Laufzeit-Cache: imageId -> HTMLImageElement (bereits dekodiert). */
const cache = new Map()
const objectUrls = new Map()

function loadElementFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Bild konnte nicht gelesen werden.'))
    }
    img.src = url
  })
}

/** Verkleinert zu grosse Bilder, damit Speicher und Renderzeit im Rahmen bleiben. */
async function downscaleIfNeeded(img, type) {
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight)
  if (longEdge <= MAX_EDGE) return null
  const scale = MAX_EDGE / longEdge
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((r) =>
    canvas.toBlob(r, type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92),
  )
  return blob
}

/**
 * Importiert einen einzelnen Blob (z.B. ein Rendition aus Lightroom).
 * @returns {Promise<{id:string,name:string,width:number,height:number}>}
 */
export async function importBlob(blob, name = 'Foto') {
  const { img, url } = await loadElementFromBlob(blob)
  const smaller = await downscaleIfNeeded(img, blob.type)

  let stored = blob
  let element = img
  let elementUrl = url
  if (smaller) {
    URL.revokeObjectURL(url)
    stored = smaller
    const reloaded = await loadElementFromBlob(smaller)
    element = reloaded.img
    elementUrl = reloaded.url
  }

  const record = {
    id: uid(),
    blob: stored,
    name,
    width: element.naturalWidth,
    height: element.naturalHeight,
    createdAt: Date.now(),
  }
  await saveImage(record)
  cache.set(record.id, element)
  objectUrls.set(record.id, elementUrl)
  return { id: record.id, name, width: record.width, height: record.height }
}

/**
 * Importiert Dateien und legt sie in der Datenbank ab.
 * @returns {Promise<Array<{id:string,width:number,height:number,name:string}>>}
 */
export async function importFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
  const records = []

  for (const file of files) {
    try {
      const { img, url } = await loadElementFromBlob(file)
      const smaller = await downscaleIfNeeded(img, file.type)

      let blob = file
      let element = img
      let elementUrl = url

      if (smaller) {
        URL.revokeObjectURL(url)
        blob = smaller
        const reloaded = await loadElementFromBlob(smaller)
        element = reloaded.img
        elementUrl = reloaded.url
      }

      const record = {
        id: uid(),
        blob,
        name: file.name,
        width: element.naturalWidth,
        height: element.naturalHeight,
        createdAt: Date.now(),
      }
      await saveImage(record)
      cache.set(record.id, element)
      objectUrls.set(record.id, elementUrl)
      records.push({ id: record.id, name: record.name, width: record.width, height: record.height })
    } catch (error) {
      console.warn('Import übersprungen:', file.name, error)
    }
  }
  return records
}

/** Holt ein Bild aus dem Cache oder lädt es aus der Datenbank nach. */
export async function getImage(id) {
  if (cache.has(id)) return cache.get(id)
  const record = await loadImage(id)
  if (!record) return null
  const { img, url } = await loadElementFromBlob(record.blob)
  cache.set(id, img)
  objectUrls.set(id, url)
  return img
}

/** Lädt alle Bilder eines Projekts und gibt eine Map id -> <img> zurück. */
export async function loadProjectImages(project) {
  const ids = usedImageIds(project)
  const entries = await Promise.all(
    ids.map(async (id) => [id, await getImage(id)]),
  )
  return new Map(entries.filter(([, img]) => img))
}

/** Object-URL für Vorschaubilder in der Seitenleiste. */
export function previewUrl(id) {
  return objectUrls.get(id) ?? null
}

export function forgetImage(id) {
  const url = objectUrls.get(id)
  if (url) URL.revokeObjectURL(url)
  objectUrls.delete(id)
  cache.delete(id)
}
