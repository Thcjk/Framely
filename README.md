# Framely

Ein **Magazin-Editor für Instagram-Carousels**. Fotostrecken als mehrseitige
Bildstrecken gestalten – asymmetrische Layouts, echte Typografie, Ecken-Marken wie
`01/10`, Credits-Zeilen – und anschliessend für Instagram exportieren oder als
Druckdatei ausgeben.

Framely läuft vollständig im Browser: kein Server, kein Konto, kein Upload. Die Fotos
bleiben auf dem Gerät und werden lokal per Canvas verarbeitet. Die App ist auf Desktop
und Smartphone installierbar und funktioniert danach auch offline.

---

## Funktionen

### Multi-Slide-Editor (Kernstück)

Ein Projekt ist ein Carousel aus beliebig vielen Slides. Jede Slide ist frei gestaltbar:

- **21 Vorlagen** als Startpunkt, in vier Gruppen:
  *Bild* (Vollbild, Bild mit Rand, Hochformat zentriert) ·
  *Split* (Vollbild neben Weissfläche – links, rechts, oben) ·
  *Mehrere* (Gross + klein, Überlappend, Zwei ungleich, Drei in Reihe, Drei versetzt,
  Streifen, Kontaktbogen 6 und 9) ·
  *Typo* (Cover mit Display-Schrift, Cover mit Bild, Text + Bild, Bild + Zitat,
  dunkle Infoseite, Schluss/Credits, leere Fläche)
- **Freie Platzierung**: jedes Element lässt sich ziehen, an den Ecken skalieren und
  stapeln (nach vorne / nach hinten). Mit den Pfeiltasten pixelgenau, mit Shift gröber.
- **Bildausschnitt** je Bild: verschieben (Modus *Ausschnitt* oder Alt-Taste),
  zoomen (Mausrad, zwei Finger, Regler), in 90°-Schritten drehen.
- **Textelemente** mit acht typografischen Rollen (Display, Titel, Titel Serif, Zitat,
  Label, Fliesstext, Credits, Ecken-Marke) – Grösse, Laufweite, Ausrichtung, Versalien,
  Schriftart und Farbe einstellbar. Textfarbe stellt sich automatisch auf den
  Hintergrund ein (heller Text auf dunklen Slides).
- **Automatische Inhalte**: ein Textelement kann Seitenzahl (`01/10`, `1/10` oder `01`),
  Credits, Serienname, Website, Ort oder Datum anzeigen. Diese Angaben stehen einmal
  im Panel *Serie* und aktualisieren sich überall.
- **Farbflächen** als eigenes Element – für Halb/Halb-Layouts.
- **Hintergrund je Slide**, inklusive Schwarz und gebrochenem Weiss.
- **Panorama**: ein breites Bild als durchgehender Streifen über mehrere Slides
  verteilen – beim Durchwischen im Feed entsteht ein fortlaufendes Bild. Die nötige
  Anzahl Slides schlägt Framely aus dem Seitenverhältnis vor.
- Bewusst **keine Animationen**: Framely baut Slides, es spielt sie nicht ab.

### Bilder

- Import per Drag & Drop oder Dateiauswahl; Fotos lassen sich direkt auf eine Stelle
  der Slide ziehen.
- **Adobe Lightroom** (optional, siehe unten).
- Bibliothek im Browser gespeichert, sehr grosse Bilder werden auf 5000 px verkleinert.

### Rahmen

Ohne Rahmen · weisser Rand · Passepartout · Polaroid · Konturlinie – **pro Bild**
einstellbar (Breite, Rahmenfarbe, Linienfarbe), weil im Magazin-Layout oft ein Bild
randlos läuft und ein anderes einen weissen Rand trägt. Ein Klick überträgt den
Rahmen auf alle Bilder.

### Format, Druck und Export

| | |
| --- | --- |
| **Instagram** | 4:5 (Carousel), 1:1, 9:16 |
| **Druck** | 10×15 bis 70×100, A4, A3 – hoch und quer |
| **Auflösungsprüfung** | effektive dpi je Bild, dreistufige Warnung |
| **Export** | ganzes Carousel oder einzelne Slide, als JPG, PNG oder mehrseitiges PDF |
| **Auflösung** | 1080 / 1440 / 2048 px für Social, 150 / 300 / 600 dpi für Druck |

Beim Export des ganzen Carousels entsteht eine nummerierte Datei je Slide
(`serie-01.jpg`, `serie-02.jpg`, …) – in genau der Reihenfolge, in der sie bei
Instagram hochgeladen werden.

### Speicherung und PWA

Projekte und Bilder liegen dauerhaft in der IndexedDB des Browsers und werden
automatisch gespeichert. Manifest, Icons und Service Worker machen Framely
installierbar und offline nutzbar.

---

## Lokales Setup

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm run build    # Produktions-Build nach dist/
npm run preview  # den Build lokal testen
npm run icons    # App-Icons neu erzeugen (public/icons/*)
```

> Der Service Worker ist im Dev-Modus absichtlich deaktiviert – Offline-Verhalten testet
> man mit `npm run build && npm run preview`.

---

## Deployment auf GitHub Pages

Der Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) baut die App
bei jedem Push auf `main` und veröffentlicht sie auf GitHub Pages.

**Einmalig einrichten:** *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
Der Workflow setzt `BASE_PATH` automatisch auf den Repository-Namen, weil GitHub Pages
unter `https://<benutzername>.github.io/<repository>/` ausliefert. Für eine eigene Domain
genügt `BASE_PATH=/ npm run build`.

---

## Aufbau des Codes

```
src/
├── main.jsx                 Einstiegspunkt, Service-Worker-Registrierung
├── App.jsx                  Gerüst: Kopfzeile, Arbeitsfläche, Slide-Leiste, Panels
├── state/
│   └── ProjectContext.jsx   Gesamter App-Zustand + alle Aktionen (React Context)
├── components/
│   ├── Stage.jsx            Leinwand: Elemente ziehen, skalieren, Ausschnitt wählen
│   ├── SlideStrip.jsx       Die Slides des Carousels als Vorschau-Leiste
│   ├── LightroomSection.jsx Adobe-Anbindung (optional)
│   ├── DpiNotice.jsx        Auflösungsprüfung für den Druck
│   ├── PrintOrderDialog.jsx Weg zur Druckbestellung
│   └── panels/              Slide, Element, Bilder, Serie, Format, Export, Projekte
└── lib/
    ├── render.js            ► Herzstück: zeichnet eine Slide auf eine Canvas
    ├── slides.js            Vorlagen, Elementtypen, typografische Rollen
    ├── text.js              Textsatz: Umbruch, Laufweite, Ausrichtung, Kontrastfarbe
    ├── project.js           Datenmodell, Slide-Verwaltung, Panorama
    ├── frames.js            Rahmenstile (pro Bild)
    ├── formats.js           Seitenverhältnisse, Druckformate, Pixelberechnung
    ├── interact.js          Treffer-Erkennung, Verschieben, Skalieren, Zoomen
    ├── images.js            Import, Verkleinerung, Bild-Cache
    ├── db.js                IndexedDB (Projekte + Bilder)
    ├── export.js            JPG/PNG/PDF erzeugen und herunterladen
    ├── pdf.js               mehrseitiger PDF-Schreiber (ohne Bibliothek)
    ├── lightroom.js         OAuth 2.0 mit PKCE + Lightroom-API
    └── printServices.js     Druckanbieter und Datei-Spezifikation
```

### Drei Ideen, die alles zusammenhalten

**1. Alles ist relativ.** Jedes Element ist ein Rechteck zwischen 0 und 1, Schriftgrössen
und Rahmenbreiten sind Anteile der kürzeren Slide-Kante. Dadurch ist eine Gestaltung
unabhängig von der Pixelgrösse – dieselbe Slide funktioniert in 1080 px und in 300 dpi.

**2. Nur eine Zeichenfunktion.** `renderSlide()` in `lib/render.js` zeichnet die
Arbeitsfläche, die Vorschaubilder der Slide-Leiste *und* den Export. Was man sieht, ist
exakt das, was exportiert wird. Wer das Aussehen ändern will, ändert genau diese
eine Funktion.

**3. Angaben stehen an einer Stelle.** Seitenzahlen und Credits sind keine abgetippten
Texte, sondern Textelemente mit automatischem Inhalt. Wird eine Slide verschoben oder
gelöscht, stimmen die Nummern weiterhin.

---

## Adobe Lightroom

Framely kann Fotos direkt aus der Lightroom-Bibliothek holen – mit einer wichtigen
Einschränkung, die vor dem Ausprobieren bekannt sein sollte:

**Die Lightroom-API ist eine Partner-API.** Adobe gibt sie nur für freigeschaltete
Integrationen frei (Scopes `lr_partner_apis` und `lr_partner_rendition_apis`), sämtliche
offiziellen Beispiele laufen serverseitig, und CORS für direkte Browser-Aufrufe sichert
Adobe nirgends zu.

Umgesetzt ist deshalb der Weg, den Adobe für Single-Page-Apps vorsieht:
**OAuth 2.0 Authorization Code Flow mit PKCE**, ganz ohne Server und ohne Client-Secret.
Im Panel *Bilder → Adobe Lightroom* trägt man die eigene Client-ID aus der
[Adobe Developer Console](https://developer.adobe.com/console) ein (als Redirect-URI die
Adresse der App), meldet sich an und lädt seine Fotos.

Verweigert Adobe den Zugriff (fehlende Freigabe → HTTP 403) oder blockt CORS, sagt die
App genau das – der lokale Import bleibt davon unberührt und ist der zuverlässige Weg.

---

## Warum keine Bestellung direkt in der App?

Geprüft: **Prodigi**, **Printful**, **Gelato** und vergleichbare Anbieter verlangen für
eine Bestellung einen geheimen API-Schlüssel im Anfrage-Header und erwarten das Druckbild
als öffentlich erreichbare URL. Beides ist mit einer reinen Frontend-App auf GitHub Pages
nicht sicher möglich – ein API-Schlüssel im JavaScript-Bundle wäre für jede Besucherin
lesbar. Ein embeddable Checkout ohne eigenen Server bietet keiner der geprüften Dienste.

Deshalb der bewusst gewählte Weg: Framely erzeugt die **fertige, korrekt dimensionierte
Druckdatei** (JPG mit 300 dpi oder PDF in exakter Papiergrösse) und führt im Dialog
*Druck bestellen* Schritt für Schritt zu ifolor, Saal Digital, WhiteWall, Pixum oder
Prodigi – inklusive kopierbarer Angaben zu Format, Auflösung und Farbraum.

---

## Datenschutz

Alle Bilder und Projekte bleiben im Browser (IndexedDB). Es gibt keine Analyse, kein
Tracking und keine Netzwerkanfragen ausser dem Laden der App selbst – und, falls man das
aktiv einrichtet, der Verbindung zu Adobe. Werden die Browserdaten dieser Seite gelöscht,
sind auch die Projekte weg; wichtige Serien also exportieren.

## Technik

React 18, Vite 5, `vite-plugin-pwa` (Workbox). Keine weiteren Laufzeit-Abhängigkeiten –
Canvas-Rendering, Textsatz, PDF-Erzeugung, Datenbank und OAuth sind im Projekt selbst
umgesetzt und kommentiert.

## Lizenz

MIT
