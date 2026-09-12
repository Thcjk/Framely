/**
 * Erzeugt die App-Icons (PNG) und das Favicon (SVG) ohne externe Bibliothek.
 *
 * Ein PNG besteht aus Chunks (IHDR, IDAT, IEND), jeder mit einer CRC-Prüfsumme.
 * Die Bilddaten sind zeilenweise abgelegt, jede Zeile beginnt mit einem
 * Filter-Byte (hier immer 0 = kein Filter) und wird mit zlib komprimiert –
 * und zlib bringt Node bereits mit.
 *
 * Aufruf:  npm run icons
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

// --- winziger PNG-Encoder ---------------------------------------------------

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** @param {{width:number, height:number, pixels:Buffer}} image RGBA */
function encodePng({ width, height, pixels }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // Bittiefe
  header[9] = 6 // Farbtyp RGBA
  // 10..12 = Kompression, Filter, Interlace (alle 0)

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // Filter-Byte
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Zeichnen ---------------------------------------------------------------

function canvas(size, [r, g, b]) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = r
    pixels[i * 4 + 1] = g
    pixels[i * 4 + 2] = b
    pixels[i * 4 + 3] = 255
  }
  return { width: size, height: size, pixels }
}

function fillRect(image, x, y, w, h, [r, g, b]) {
  const x0 = Math.round(x)
  const y0 = Math.round(y)
  const x1 = Math.round(x + w)
  const y1 = Math.round(y + h)
  for (let py = Math.max(0, y0); py < Math.min(image.height, y1); py++) {
    for (let px = Math.max(0, x0); px < Math.min(image.width, x1); px++) {
      const i = (py * image.width + px) * 4
      image.pixels[i] = r
      image.pixels[i + 1] = g
      image.pixels[i + 2] = b
      image.pixels[i + 3] = 255
    }
  }
}

const INK = [17, 17, 17]
const PAPER = [255, 255, 255]

/**
 * Die Bildmarke: drei Flächen, die ein Collagen-Layout andeuten –
 * links eine hohe Fläche, rechts zwei gestapelte.
 */
function drawMark(image, scale) {
  const size = image.width
  const s = size * scale
  const x = (size - s) / 2
  const y = (size - s) / 2
  fillRect(image, x, y, s * 0.36, s, PAPER)
  fillRect(image, x + s * 0.52, y, s * 0.48, s * 0.44, PAPER)
  fillRect(image, x + s * 0.52, y + s * 0.56, s * 0.48, s * 0.44, PAPER)
}

function icon(size, scale) {
  const image = canvas(size, INK)
  drawMark(image, scale)
  return encodePng(image)
}

// --- Schreiben --------------------------------------------------------------

mkdirSync(resolve(publicDir, 'icons'), { recursive: true })

const files = [
  ['icons/icon-192.png', icon(192, 0.58)],
  ['icons/icon-512.png', icon(512, 0.58)],
  // Maskable: Motiv kleiner, damit beim runden Zuschnitt nichts abgeschnitten wird.
  ['icons/icon-maskable-512.png', icon(512, 0.44)],
  ['apple-touch-icon.png', icon(180, 0.58)],
]

for (const [name, data] of files) {
  writeFileSync(resolve(publicDir, name), data)
  console.log('geschrieben:', name, `${(data.length / 1024).toFixed(1)} kB`)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#111111"/>
  <g fill="#ffffff">
    <rect x="13" y="13" width="13.7" height="38"/>
    <rect x="32.8" y="13" width="18.2" height="16.7"/>
    <rect x="32.8" y="34.3" width="18.2" height="16.7"/>
  </g>
</svg>
`
writeFileSync(resolve(publicDir, 'favicon.svg'), svg)
console.log('geschrieben: favicon.svg')
