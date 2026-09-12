# Framely

Eine Progressive Web App, um eigene Fotos zu **Layouts und Collagen** anzuordnen, mit
**Rahmen** zu versehen und anschliessend für **Instagram** oder den **Druck** zu
exportieren.

Framely läuft vollständig im Browser: kein Server, kein Konto, kein Upload. Die Fotos
bleiben auf dem Gerät und werden lokal per Canvas verarbeitet. Die App ist auf Desktop
und Smartphone installierbar und funktioniert danach auch offline.

---

## Funktionen

| Bereich | Was geht |
| --- | --- |
| **Bilder** | Import per Drag & Drop oder Dateiauswahl, Bibliothek im Browser gespeichert |
| **Layout** | 12 Vorlagen (2er-/3er-/4er-Splits, 6er- und 9er-Raster, Filmstreifen) sowie ein freies Layout mit verschiebbaren und skalierbaren Zellen |
| **Bildbearbeitung** | Verschieben, Zoomen (Mausrad, zwei Finger, Tasten), Drehen in 90°-Schritten, Bilder zwischen Plätzen tauschen |
| **Format** | Instagram-Verhältnisse (1:1, 4:5, 9:16, 1.91:1, 3:2, 2:3) und Druckformate (10×15 bis 70×100, A4, A3) in Hoch- und Querformat |
| **Rahmen** | Ohne Rahmen, weisser Rand, Passepartout, Polaroid, Konturlinie – mit einstellbarer Breite, Abstand und Farben |
| **Druckprüfung** | Effektive Auflösung je Bild in dpi, Warnung wenn sie für das gewählte Format zu niedrig ist |
| **Export** | JPG, PNG und PDF; für Social in 1080/1440/2048 px, für Druck in 150/300/600 dpi |
| **Speicherung** | Projekte und Bilder liegen dauerhaft in der IndexedDB des Browsers, automatisch gespeichert |
| **PWA** | Installierbar (Manifest + Icons), offline nutzbar (Service Worker) |

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

Das Repository enthält den Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
Er baut die App bei jedem Push auf `main` und veröffentlicht sie auf GitHub Pages.

**Einmalig einrichten:** *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.

Danach ist die App erreichbar unter `https://<benutzername>.github.io/<repository>/`.

Der Pfad muss beim Build bekannt sein, weil alle Dateien relativ dazu geladen werden.
Der Workflow setzt dafür `BASE_PATH` automatisch auf den Repository-Namen
(siehe [`vite.config.js`](vite.config.js)). Für eine eigene Domain genügt
`BASE_PATH=/ npm run build`.

---

## Aufbau des Codes

```
src/
├── main.jsx                 Einstiegspunkt, Service-Worker-Registrierung
├── App.jsx                  Gerüst: Kopfzeile, Arbeitsfläche, Seitenleiste, Dialoge
├── state/
│   └── ProjectContext.jsx   Gesamter App-Zustand + alle Aktionen (React Context)
├── components/
│   ├── Stage.jsx            Leinwand mit Maus-/Finger-Bedienung
│   ├── Sidebar.jsx          Reiter-Navigation
│   ├── DpiNotice.jsx        Auflösungsprüfung für den Druck
│   ├── PrintOrderDialog.jsx Weg zur Druckbestellung
│   └── panels/              Bilder, Layout, Format, Rahmen, Export, Projekte
└── lib/
    ├── render.js            ► Herzstück: zeichnet ein Projekt auf eine Canvas
    ├── layouts.js           Vorlagen als relative Rechtecke (0..1)
    ├── frames.js            Rahmenstile und ihre Standardwerte
    ├── formats.js           Seitenverhältnisse, Druckformate, Pixelberechnung
    ├── project.js           Datenmodell eines Projekts
    ├── images.js            Import, Verkleinerung, Bild-Cache
    ├── db.js                IndexedDB (Projekte + Bilder)
    ├── interact.js          Treffer-Erkennung, Zoomen, Verschieben
    ├── export.js            JPG/PNG/PDF erzeugen und herunterladen
    ├── pdf.js               minimaler PDF-Schreiber (ohne Bibliothek)
    └── printServices.js     Druckanbieter und Datei-Spezifikation
```

### Zwei Ideen, die alles zusammenhalten

**1. Alles ist relativ.** Ein Layout besteht aus Rechtecken zwischen 0 und 1, Rahmenbreiten
sind Prozente der kürzeren Kante. Dadurch ist eine Gestaltung unabhängig von der
Pixelgrösse.

**2. Nur eine Zeichenfunktion.** `renderProject()` in `lib/render.js` zeichnet die
Bildschirmvorschau *und* den Export – nur auf unterschiedlich grosse Leinwände. Was man
sieht, ist exakt das, was exportiert wird. Wer das Aussehen ändern will, ändert genau
diese eine Funktion.

---

## Warum keine Bestellung direkt in der App?

Der ursprüngliche Wunsch war ein Direkt-Checkout bei einem Print-on-Demand-Dienst. Bei der
Umsetzung geprüft: **Prodigi**, **Printful**, **Gelato** und vergleichbare Anbieter
verlangen für eine Bestellung einen geheimen API-Schlüssel im Anfrage-Header und erwarten
das Druckbild als **öffentlich erreichbare URL**.

Beides ist mit einer reinen Frontend-App auf GitHub Pages nicht sicher möglich: Ein
API-Schlüssel im JavaScript-Bundle wäre für jede Besucherin lesbar und könnte für fremde
Bestellungen missbraucht werden. Ein embeddable Checkout ohne eigenen Server bietet
keiner der geprüften Dienste an.

Deshalb der bewusst gewählte Weg (Fallback aus der Aufgabenstellung): Framely erzeugt die
**fertige, korrekt dimensionierte Druckdatei** (JPG mit 300 dpi oder PDF in exakter
Papiergrösse) und führt im Dialog *Druck bestellen* Schritt für Schritt zu ifolor, Saal
Digital, WhiteWall, Pixum oder Prodigi – inklusive kopierbarer Angaben zu Format,
Auflösung und Farbraum für das Upload-Formular.

Sollte später ein kleines Backend dazukommen (z.B. eine Serverless-Funktion), lässt sich
die Bestellung in `lib/printServices.js` ergänzen, ohne den Editor anzufassen.

---

## Datenschutz

Alle Bilder und Projekte bleiben im Browser (IndexedDB). Es gibt keine Analyse, kein
Tracking und keine Netzwerkanfragen ausser dem Laden der App selbst. Werden die
Browserdaten dieser Seite gelöscht, sind auch die Projekte weg – wichtige Layouts also
exportieren.

## Technik

React 18, Vite 5, `vite-plugin-pwa` (Workbox). Keine weiteren Laufzeit-Abhängigkeiten –
Canvas-Rendering, PDF-Erzeugung und Datenbank sind im Projekt selbst umgesetzt und
kommentiert.

## Lizenz

MIT
