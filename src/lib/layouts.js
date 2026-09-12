/**
 * Layout-Vorlagen.
 *
 * Ein Layout besteht aus Zellen. Jede Zelle ist ein Rechteck in relativen
 * Koordinaten (0..1) innerhalb der Arbeitsfläche. Dadurch ist ein Layout
 * unabhängig von der tatsächlichen Pixelgrösse – dieselbe Definition
 * funktioniert für die Vorschau am Bildschirm und für den 300-dpi-Export.
 *
 * `freeform: true` bedeutet: die Zellen dürfen im Editor frei verschoben
 * und skaliert werden (die Vorlage liefert nur den Startzustand).
 */

const cell = (x, y, w, h) => ({ x, y, w, h })

export const LAYOUTS = [
  { id: 'single', label: 'Einzelbild', cells: [cell(0, 0, 1, 1)] },
  {
    id: 'split-v',
    label: '2 nebeneinander',
    cells: [cell(0, 0, 0.5, 1), cell(0.5, 0, 0.5, 1)],
  },
  {
    id: 'split-h',
    label: '2 übereinander',
    cells: [cell(0, 0, 1, 0.5), cell(0, 0.5, 1, 0.5)],
  },
  {
    id: 'three-v',
    label: '3 Spalten',
    cells: [cell(0, 0, 1 / 3, 1), cell(1 / 3, 0, 1 / 3, 1), cell(2 / 3, 0, 1 / 3, 1)],
  },
  {
    id: 'three-h',
    label: '3 Zeilen',
    cells: [cell(0, 0, 1, 1 / 3), cell(0, 1 / 3, 1, 1 / 3), cell(0, 2 / 3, 1, 1 / 3)],
  },
  {
    id: 'big-left',
    label: 'Gross links',
    cells: [cell(0, 0, 0.6, 1), cell(0.6, 0, 0.4, 0.5), cell(0.6, 0.5, 0.4, 0.5)],
  },
  {
    id: 'big-top',
    label: 'Gross oben',
    cells: [cell(0, 0, 1, 0.6), cell(0, 0.6, 0.5, 0.4), cell(0.5, 0.6, 0.5, 0.4)],
  },
  {
    id: 'grid-4',
    label: '4er-Raster',
    cells: [
      cell(0, 0, 0.5, 0.5),
      cell(0.5, 0, 0.5, 0.5),
      cell(0, 0.5, 0.5, 0.5),
      cell(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: 'grid-6',
    label: '6er-Raster',
    cells: [0, 1, 2, 3, 4, 5].map((i) =>
      cell((i % 3) / 3, Math.floor(i / 3) / 2, 1 / 3, 1 / 2),
    ),
  },
  {
    id: 'grid-9',
    label: '9er-Raster',
    cells: Array.from({ length: 9 }, (_, i) =>
      cell((i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3),
    ),
  },
  {
    id: 'strip',
    label: 'Filmstreifen',
    cells: Array.from({ length: 4 }, (_, i) => cell(0, i / 4, 1, 1 / 4)),
  },
  {
    id: 'free',
    label: 'Frei anordnen',
    freeform: true,
    cells: [cell(0.04, 0.04, 0.55, 0.55), cell(0.42, 0.4, 0.54, 0.56)],
  },
]

export function getLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]
}
