/** Kleines Vorschaubild aus der Bilddatenbank. */
import { useEffect, useState } from 'react'
import { getImage } from '../lib/images.js'

export default function Thumb({ imageId, alt = '' }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!imageId) return setSrc(null)
    getImage(imageId).then((img) => {
      if (!cancelled && img) setSrc(img.src)
    })
    return () => {
      cancelled = true
    }
  }, [imageId])

  if (!src) return <span className="thumb thumb--empty" aria-hidden="true" />
  return <img className="thumb" src={src} alt={alt} loading="lazy" draggable={false} />
}
