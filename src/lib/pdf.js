/**
 * Minimaler PDF-Schreiber (ohne externe Bibliothek).
 *
 * Ein PDF ist im Kern eine Textdatei mit nummerierten Objekten und einer
 * Referenztabelle ("xref") am Ende, die für jedes Objekt dessen Byte-Position
 * angibt. Wir brauchen nur fünf Objekte:
 *
 *   1 Catalog  -> Einstiegspunkt
 *   2 Pages    -> Seitenbaum
 *   3 Page     -> die Seite inkl. MediaBox (= Seitengrösse in Punkt)
 *   4 Contents -> Zeichenanweisungen ("male Bild Im0 über die ganze Seite")
 *   5 XObject  -> das Bild selbst
 *
 * Trick: Ein JPEG kann unverändert eingebettet werden (Filter /DCTDecode).
 * Es muss also nichts neu komprimiert werden – das PDF bleibt klein und
 * verliert keine Qualität.
 */

const PT_PER_MM = 72 / 25.4
const encoder = new TextEncoder()

/**
 * @param {Uint8Array} jpegBytes  Baseline-JPEG (z.B. aus canvas.toBlob)
 * @param {{widthMm:number, heightMm:number, imgW:number, imgH:number, title?:string}} options
 * @returns {Blob} PDF
 */
export function jpegToPdf(jpegBytes, { widthMm, heightMm, imgW, imgH, title = 'Framely' }) {
  const pageW = (widthMm * PT_PER_MM).toFixed(3)
  const pageH = (heightMm * PT_PER_MM).toFixed(3)

  const chunks = []
  let length = 0
  /** Hängt Text oder Bytes an und merkt sich die Gesamtlänge. */
  const push = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data
    chunks.push(bytes)
    length += bytes.length
    return length
  }

  const offsets = [] // Byte-Position je Objekt (Index 0 = Objekt 1)
  const beginObject = (number) => {
    offsets[number - 1] = length
    push(`${number} 0 obj\n`)
  }

  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`
  const date = pdfDate(new Date())

  push('%PDF-1.4\n%âãÏÓ\n')

  beginObject(1)
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

  beginObject(2)
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')

  beginObject(3)
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  )

  beginObject(4)
  push(`<< /Length ${encoder.encode(content).length} >>\nstream\n`)
  push(content)
  push('endstream\nendobj\n')

  beginObject(5)
  push(
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpegBytes.length} >>\nstream\n`,
  )
  push(jpegBytes)
  push('\nendstream\nendobj\n')

  beginObject(6)
  push(
    `<< /Title (${escapeText(title)}) /Producer (Framely) /CreationDate (${date}) >>\nendobj\n`,
  )

  // Referenztabelle: jeder Eintrag ist exakt 20 Byte lang.
  const xrefStart = length
  const count = offsets.length + 1
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`
  offsets.forEach((offset) => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  push(xref)
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`)

  return new Blob(chunks, { type: 'application/pdf' })
}

function escapeText(value) {
  return value.replace(/([\\()])/g, '\\$1')
}

function pdfDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}
