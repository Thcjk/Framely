/**
 * Minimaler PDF-Schreiber (ohne externe Bibliothek), jetzt mehrseitig.
 *
 * Ein PDF ist im Kern eine Textdatei mit nummerierten Objekten und einer
 * Referenztabelle ("xref") am Ende, die für jedes Objekt dessen Byte-Position
 * angibt. Pro Seite brauchen wir drei Objekte: Page, Contents und das Bild.
 *
 * Trick: Ein JPEG kann unverändert eingebettet werden (Filter /DCTDecode).
 * Es muss also nichts neu komprimiert werden – das PDF bleibt klein und
 * verliert keine Qualität.
 */

const PT_PER_MM = 72 / 25.4
const encoder = new TextEncoder()

/**
 * @param {Array<{jpeg:Uint8Array, imgW:number, imgH:number}>} pages
 * @param {{widthMm:number, heightMm:number, title?:string}} options
 * @returns {Blob}
 */
export function jpegsToPdf(pages, { widthMm, heightMm, title = 'Framely' }) {
  const pageW = (widthMm * PT_PER_MM).toFixed(3)
  const pageH = (heightMm * PT_PER_MM).toFixed(3)

  const chunks = []
  let length = 0
  const push = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data
    chunks.push(bytes)
    length += bytes.length
  }

  const offsets = [] // Byte-Position je Objekt (Index 0 = Objekt 1)
  const beginObject = (number) => {
    offsets[number - 1] = length
    push(`${number} 0 obj\n`)
  }

  // Objekt-Nummern: 1 Catalog, 2 Pages, 3 Info, danach je Seite 3 Objekte.
  const firstPageObject = 4
  const pageIds = pages.map((_, i) => firstPageObject + i * 3)

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')

  beginObject(1)
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

  beginObject(2)
  push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
  )

  beginObject(3)
  push(
    `<< /Title (${escapeText(title)}) /Producer (Framely) /CreationDate (${pdfDate(new Date())}) >>\nendobj\n`,
  )

  pages.forEach((page, i) => {
    const pageId = pageIds[i]
    const contentId = pageId + 1
    const imageId = pageId + 2
    const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`

    beginObject(pageId)
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    )

    beginObject(contentId)
    push(`<< /Length ${encoder.encode(content).length} >>\nstream\n`)
    push(content)
    push('endstream\nendobj\n')

    beginObject(imageId)
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.imgW} /Height ${page.imgH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${page.jpeg.length} >>\nstream\n`,
    )
    push(page.jpeg)
    push('\nendstream\nendobj\n')
  })

  // Referenztabelle: jeder Eintrag ist exakt 20 Byte lang.
  const xrefStart = length
  const count = offsets.length + 1
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (let i = 0; i < offsets.length; i++) {
    xref += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`
  }
  push(xref)
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`)

  return new Blob(chunks, { type: 'application/pdf' })
}

function escapeText(value) {
  return String(value).replace(/([\\()])/g, '\\$1')
}

function pdfDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}
