/**
 * Druckanbieter.
 *
 * Hinweis zur Technik: Framely ist eine reine Frontend-App auf GitHub Pages –
 * es gibt keinen Server. Alle geprüften Print-on-Demand-Dienste (Prodigi,
 * Printful, Gelato & Co.) verlangen für eine Bestellung einen geheimen
 * API-Schlüssel und eine öffentlich erreichbare Bild-URL. Beides ist im
 * Browser nicht sicher machbar: ein API-Key im JavaScript-Bundle wäre für
 * jede Besucherin lesbar.
 *
 * Darum der bewusst gewählte Weg: Framely erzeugt die fertige, korrekt
 * dimensionierte Druckdatei – hochgeladen wird sie beim Anbieter der Wahl.
 */

export const PRINT_SERVICES = [
  {
    id: 'ifolor',
    name: 'ifolor',
    region: 'Schweiz',
    note: 'Abzüge, Poster, Leinwand. Versand aus der Schweiz.',
    url: 'https://www.ifolor.ch/',
  },
  {
    id: 'saal',
    name: 'Saal Digital',
    region: 'Europa',
    note: 'Fotoabzüge und Poster in hoher Qualität, ICC-Profile verfügbar.',
    url: 'https://www.saal-digital.ch/',
  },
  {
    id: 'whitewall',
    name: 'WhiteWall',
    region: 'Europa',
    note: 'Galerie-Qualität, viele Rahmen- und Kaschier-Optionen.',
    url: 'https://www.whitewall.com/',
  },
  {
    id: 'pixum',
    name: 'Pixum',
    region: 'Europa',
    note: 'Günstige Abzüge und Fotobücher.',
    url: 'https://www.pixum.ch/',
  },
  {
    id: 'prodigi',
    name: 'Prodigi',
    region: 'Weltweit',
    note: 'Print-on-Demand mit API – die Bestellung braucht allerdings einen eigenen Server.',
    url: 'https://www.prodigi.com/',
  },
]

/** Kurzbeschreibung der Druckdatei, z.B. zum Kopieren in ein Bestellformular. */
export function printSpec({ formatLabel, widthMm, heightMm, width, height, dpi }) {
  return [
    `Format: ${formatLabel} (${widthMm} × ${heightMm} mm)`,
    `Auflösung: ${width} × ${height} px bei ${dpi} dpi`,
    'Farbraum: sRGB',
    'Randabschluss: Datei bereits fertig layoutet – bitte ohne zusätzlichen Beschnitt drucken',
  ].join('\n')
}
