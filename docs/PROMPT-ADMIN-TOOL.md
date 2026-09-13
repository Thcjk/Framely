# Prompt: Bild-Anordnung ins eigene Admin-Tool einbauen

Diesen Text in **Claude Code im Repository eurer Website** einfügen. Er ist so
geschrieben, dass er ohne Vorwissen über euren Stack funktioniert: Schritt 0 lässt
zuerst die Bestandsaufnahme machen.

Vor dem Absenden die zwei Zeilen in eckigen Klammern ausfüllen, falls ihr die
Antworten kennt – dann wird das Ergebnis genauer.

---

```text
# Auftrag: Bilder im Admin-Tool frei anordnen

## Kontext

Unsere Website hat ein Admin-Tool, in dem wir Beiträge bearbeiten. Darin möchte ich
Bilder frei anordnen können – so wie im Editor „Framely“:
https://github.com/Thcjk/Framely (MIT-Lizenz, unser eigenes Projekt).

Schau dir dort vor allem diese Dateien an und übernimm die Bauweise. Den Code darfst
du kopieren und anpassen, musst du aber nicht 1:1:

- src/lib/render.js    – die einzige Zeichenfunktion (Vorschau UND Export)
- src/lib/slides.js    – Vorlagen und Elementtypen
- src/lib/interact.js  – ziehen, skalieren, zoomen, Magnet
- src/lib/text.js      – Textsatz auf Canvas (Umbruch, Laufweite, Kontrastfarbe)
- src/components/Stage.jsx – die Arbeitsfläche

Unsere Seite / unser Admin-Tool ist gebaut mit: [hier eintragen, falls bekannt]
Bilder werden gespeichert als: [hier eintragen, z.B. „Medienbibliothek mit URLs“]

## Schritt 0 – Bestandsaufnahme, bevor du Code schreibst

Sieh dir das Repository an und berichte mir in ein paar Sätzen:

1. Womit sind Website und Admin-Tool gebaut (Framework, Build, Sprache)?
2. Wie werden Beiträge gespeichert – Datenbank, API, welche Felder? Wo könnte ein
   zusätzliches JSON-Feld für das Layout hin?
3. Wie werden Bilder hochgeladen und ausgeliefert (Medienbibliothek, URLs, gibt es
   verschiedene Grössen)?
4. Gibt es ein Design-System oder CSS-Konventionen, an die du dich halten sollst?
5. Wo genau würdest du den Editor einhängen?

Dann warte auf mein OK. Erst danach baust du.

## Was gebaut werden soll

Ein Editor im Admin-Tool, mit dem ich pro Beitrag eine oder mehrere Bild-Anordnungen
gestalte:

- Bilder aus unserer bestehenden Medienbibliothek auf eine Fläche setzen
- Jedes Bild frei verschieben, an den Ecken skalieren, in der Stapelreihenfolge
  nach vorne/hinten legen
- Bildausschnitt je Bild: innerhalb seines Rahmens verschieben und zoomen
  (Mausrad, zwei Finger, Regler), in 90°-Schritten drehen
- Textelemente mit ein paar festen Rollen (Titel, Fliesstext, Bildunterschrift,
  kleine Marke) – Grösse, Ausrichtung, Farbe einstellbar
- Farbflächen als eigenes Element
- Hintergrundfarbe je Anordnung
- Eine Handvoll Startvorlagen (Vollbild, halb/halb, zwei ungleich, Raster)
- Magnet beim Verschieben: einrasten an Rändern, Mitte und Nachbarelementen,
  mit sichtbaren Hilfslinien; optional ein Spaltenraster als Hilfe
- Seitenverhältnis wählbar (mindestens 4:5, 1:1, 16:9)

Ausdrücklich NICHT nötig: Animationen, Filter, Bildkorrektur, Druckformate, PDF.

## Datenmodell – bitte genau so

Das Layout ist ein kleines JSON-Objekt, das beim Beitrag gespeichert wird. Bilder
liegen NICHT darin, nur ihre Referenz auf die Medienbibliothek.

  {
    "ratio": 0.8,                 // Breite / Höhe, z.B. 4:5 = 0.8
    "background": "#ffffff",
    "items": [
      {
        "id": "a1",
        "type": "image",          // "image" | "text" | "block"
        "src": "<URL oder Medien-ID>",
        "rect": { "x": 0.08, "y": 0.1, "w": 0.5, "h": 0.42 },
        "zoom": 1, "offsetX": 0, "offsetY": 0, "rotation": 0,
        "frame": { "style": "none", "width": 0, "color": "#ffffff" }
      },
      {
        "id": "a2",
        "type": "text",
        "rect": { "x": 0.08, "y": 0.6, "w": 0.6, "h": 0.1 },
        "text": "Bildunterschrift",
        "preset": "caption",
        "color": null             // null = automatischer Kontrast zum Hintergrund
      }
    ]
  }

## Die drei Regeln, die das Ganze tragen

1. **Alles ist relativ.** Jede Position und Grösse ist ein Wert zwischen 0 und 1,
   bezogen auf die Fläche. Schriftgrössen und Rahmenbreiten sind Anteile der
   kürzeren Kante. Dadurch funktioniert dieselbe Anordnung in der kleinen Vorschau
   im Admin-Tool, in der grossen Arbeitsfläche und im Export.

2. **Nur eine Zeichenfunktion.** Eine Funktion `render(ctx, layout, images, W, H)`
   zeichnet die Arbeitsfläche, die Vorschaubilder UND den Export – nur auf
   unterschiedlich grosse Canvas. Was man sieht, ist exakt das, was gespeichert wird.
   Baue keine zweite Darstellung mit DOM-Elementen daneben, das läuft garantiert
   auseinander.

3. **Bilder gehören nicht ins Layout.** Im JSON steht nur die Referenz. Die Bilder
   kommen aus unserer Medienbibliothek und werden zur Laufzeit geladen.

## Technische Vorgaben

- Canvas 2D, keine schwere Bibliothek. Frag mich, bevor du eine Abhängigkeit
  hinzufügst.
- Bildausschnitt nach „cover“ plus Zoom und Verschiebung, genau so:

      cover  = max(rect.w / img.w, rect.h / img.h)
      scale  = cover * zoom              // zoom >= 1
      dw     = img.w * scale
      dh     = img.h * scale
      maxX   = max(0, (dw - rect.w) / 2)
      tx     = clamp(offsetX * rect.w, -maxX, maxX)   // analog für y

  Die Begrenzung sorgt dafür, dass nie ein leerer Rand entsteht.
- Vorschau mit `devicePixelRatio` rechnen (auf 2 deckeln), sonst ist alles unscharf.
- Auf der Canvas `touch-action: none` setzen und Pointer-Events benutzen, damit
  Wischen und Zwei-Finger-Zoom funktionieren statt die Seite zu scrollen.
- Bilder vor dem Zeichnen fertig laden (`await img.decode()`), sonst bleiben beim
  ersten Rendern Flächen leer.
- Die Reihenfolge im `items`-Array ist die Stapelreihenfolge: hinten im Array =
  vorne im Bild.

## Speichern und Ausgeben

Beides, nicht nur eines davon:

1. **Das Layout-JSON** wird am Beitrag gespeichert – damit bleibt die Anordnung
   später bearbeitbar.
2. **Ein gerendertes JPG** (längste Kante 1440 px, Qualität 0.92) wird beim
   Speichern erzeugt und in die Medienbibliothek gelegt, damit die öffentliche
   Seite ein fertiges Bild ausliefern kann und nichts im Browser rendern muss.

Schlag mir vor, wie das in unsere bestehende Speicher- und Upload-Logik passt,
bevor du es baust.

## Stolperfallen (aus der echten Umsetzung)

- **Vorlagen-Hintergrund:** Bringt eine Vorlage eine eigene Hintergrundfarbe mit
  (z.B. eine dunkle Seite), muss sie Vorrang haben vor einer übernommenen Farbe –
  sonst wird die dunkle Vorlage weiss eingefügt.
- **EXIF-Drehung:** Ein `<img>`-Element dreht Hochformat-Fotos automatisch richtig,
  `createImageBitmap` ohne `imageOrientation: 'from-image'` nicht.
- **Sehr grosse Canvas:** Über etwa 40 Megapixel scheitert `toBlob` je nach Browser
  (Safari deutlich früher). Zielgrösse deckeln und im Zweifel verkleinern, statt den
  Export scheitern zu lassen.
- **Text auf Canvas:** Zeilenumbruch, Laufweite und vertikale Ausrichtung gibt es
  nicht von selbst – `ctx.letterSpacing` kennen nicht alle Browser, also einen
  Rückfallweg einbauen (zeichenweise zeichnen).
- **Textfarbe:** aus der Helligkeit des Hintergrunds ableiten, damit Text auf
  dunklen Flächen automatisch hell wird.

## Vorgehen

- Arbeite in kleinen Schritten und committe jeden Schritt einzeln.
- Halte dich an die bestehenden Konventionen des Repositories (Sprache, Ordner,
  Stil, Tests).
- Keine neuen Design-Systeme oder UI-Bibliotheken.
- Sag mir, wenn etwas aus diesem Auftrag nicht zu unserem Stack passt, statt es
  stillschweigend anders zu machen.

## Abnahme – so prüfe ich es

Zeig mir am Ende, dass das hier funktioniert:

1. Im Admin-Tool einen Beitrag öffnen, den Editor starten, drei Bilder aus der
   Medienbibliothek platzieren.
2. Ein Bild verschieben, ein anderes an der Ecke grösser ziehen, ein drittes im
   Ausschnitt zoomen und verschieben.
3. Eine Bildunterschrift einfügen und die Schriftgrösse ändern.
4. Hintergrund auf Schwarz stellen – der Text muss automatisch hell werden.
5. Speichern, Seite neu laden, Beitrag wieder öffnen: die Anordnung ist unverändert
   da und weiter bearbeitbar.
6. Das erzeugte JPG liegt in der Medienbibliothek und sieht exakt aus wie die
   Arbeitsfläche.
7. Auf dem Smartphone: ein Bild mit dem Finger verschieben und mit zwei Fingern
   zoomen funktioniert, die Seite scrollt dabei nicht weg.
```
