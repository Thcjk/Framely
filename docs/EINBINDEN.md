# Framely in die eigene Website einbauen

Diese Anleitung richtet sich an euch – und an alle, die eure Website betreuen.

---

## Zuerst: was genau soll auf die Website?

Es sind zwei ganz verschiedene Dinge, und sie brauchen unterschiedliche Wege:

| | Ziel | Weg |
| --- | --- | --- |
| **A** | **Das Werkzeug** – ihr (oder Besucher) gestaltet Carousels direkt auf eurer Seite | Weg 1–4 unten |
| **B** | **Die Ergebnisse** – fertige Bildstrecken auf der Seite zeigen | Abschnitt „Nur die Ergebnisse zeigen“ |

Für **B** braucht es Framely auf der Website gar nicht: dort exportiert ihr die Slides als
JPG und baut daraus eine Galerie. Das ist deutlich einfacher und lädt schneller.

---

## Was Framely technisch ist

Die Kurzfassung für die Person, die eure Website betreut:

- **Rein statische Dateien.** Nach dem Build liegt in `dist/`: `index.html`, ein Ordner
  `assets/` mit je einer JS- und CSS-Datei, `manifest.webmanifest`, `sw.js` und die Icons.
  Das war's – hochladen, fertig.
- **Kein Backend, keine Datenbank, keine Laufzeit-Variablen.** Nichts, was auf einem
  Server laufen müsste.
- **Grösse:** rund 226 KB JavaScript und 15 KB CSS (73 KB bzw. 3 KB übertragen),
  insgesamt etwa 253 KB.
- **Daten** liegen ausschliesslich im Browser der Nutzerin: eine IndexedDB namens
  `framely` (Projekte und Fotos) und ein Eintrag in `localStorage`. Nichts wird
  hochgeladen, es gibt kein Tracking und keine Aufrufe an fremde Server.
- **Voraussetzungen:** aktueller Browser (Canvas, IndexedDB, ES-Module) und **HTTPS** –
  der Service Worker, der die App offline nutzbar macht, funktioniert nur über HTTPS
  (Ausnahme: `localhost` beim Entwickeln).

---

## Weg 1 — Unterordner auf eurer Domain *(empfohlen)*

Das Ergebnis: `chairoundtimphotography.ch/framely/`

Voraussetzung: Ihr könnt Dateien auf euren Webspace legen (FTP, Netlify, Vercel, ein
eigener Server – alles recht).

```bash
git clone https://github.com/Thcjk/Framely.git
cd Framely
npm install

# Der Pfad muss exakt dem Zielordner entsprechen – mit Schrägstrich vorn und hinten:
BASE_PATH=/framely/ npm run build
```

Danach den **Inhalt** von `dist/` in den Ordner `framely/` auf eurem Webspace laden.

Von der Hauptseite verlinken:

```html
<a href="/framely/">Layout-Werkzeug öffnen</a>
```

**Warum diese Variante die beste ist:** Die App läuft unter eurer Domain. Damit gelten
keine Einschränkungen beim Browserspeicher, die Projekte bleiben zuverlässig erhalten,
und die App ist von eurer Seite aus installierbar.

> Geprüft: Build mit `BASE_PATH=/framely/`, ausgeliefert aus einem Unterordner – App
> lädt, Service Worker registriert sich korrekt auf `/framely/`, Bildimport und
> Speicherung funktionieren auch nach dem Neuladen.

---

## Weg 2 — Als Fenster (iframe) in eine bestehende Seite

Wenn das Werkzeug mitten auf einer eurer Seiten sitzen soll:

```html
<iframe
  src="/framely/"
  title="Framely – Layout-Werkzeug"
  allow="clipboard-write"
  style="width: 100%; height: 820px; border: 1px solid #e3e2dd;"
></iframe>
```

**Wichtig – nur zusammen mit Weg 1 benutzen.** Das eingebettete Framely muss unter
*derselben* Domain liegen. Bettet ihr stattdessen `https://thcjk.github.io/Framely/`
in eure Seite ein, ist es für den Browser ein fremder Anbieter: Safari und iOS
sperren dann den Speicher von Drittanbietern, und die Projekte können verschwinden.
In dem Fall lieber verlinken statt einbetten.

Weitere Hinweise:

- Höhe mindestens 700–820 px, sonst wird die Arbeitsfläche sehr klein.
- Auf dem Smartphone ist ein **Link** fast immer besser als ein eingebettetes Fenster –
  der Editor braucht die volle Bildschirmhöhe.

> Geprüft: iframe auf einer Testseite unter derselben Domain – Editor lädt, Bildimport
> und Speicherung funktionieren, auch nachdem die umgebende Seite neu geladen wurde.

---

## Weg 3 — Eigene Subdomain

Sinnvoll, wenn eure Website bei einem Baukasten liegt (Wix, Squarespace, Jimdo …) und
ihr dort keine eigenen Dateien hochladen könnt. Dann bleibt die App bei GitHub Pages,
läuft aber unter eurer Adresse, zum Beispiel `framely.chairoundtimphotography.ch`.

1. Bei eurem Domain-Anbieter einen **CNAME-Eintrag** anlegen:
   `framely` → `thcjk.github.io`
2. Im Repository: *Settings → Pages → Custom domain* die Adresse eintragen und
   *Enforce HTTPS* aktivieren.
3. Die App liegt dann im Wurzelverzeichnis der Subdomain, der Basis-Pfad ist also `/`.
   Dafür in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) die eine
   Zeile ändern:

   ```yaml
   - run: npm run build
     env:
       BASE_PATH: /        # statt /${{ github.event.repository.name }}/
   ```

4. Von der Hauptseite verlinken.

---

## Weg 4 — Als Komponente in eine React-Seite

Nur sinnvoll, wenn eure Website selbst mit React oder Next.js gebaut ist. Dann liessen
sich `ProjectProvider` und `App` aus `src/` importieren und samt `src/styles/app.css`
in eine Seite einhängen.

Ehrlich gesagt: **Der Aufwand lohnt selten.** Ihr handelt euch Konflikte bei den
Stilen, beim Basis-Pfad und beim Service Worker ein und gewinnt dafür wenig, weil
Framely ohnehin die ganze Seite füllt. Weg 1 liefert dasselbe Ergebnis in fünf Minuten.

---

## Nur die Ergebnisse zeigen (Fall B)

Wenn auf der Website nur die **fertigen Bildstrecken** erscheinen sollen:

1. In Framely: Reiter *Export* → Umfang **Alle Slides** → **JPG**, längste Kante
   **1440 px** (für die Website reichen auch 1080 px).
2. Die nummerierten Dateien (`serie-01.jpg`, `serie-02.jpg`, …) auf die Website laden.
3. Als Galerie mit Wisch-Bedienung einbinden – das kommt ohne JavaScript aus:

```html
<div class="carousel">
  <img src="/bilder/serie-01.jpg" alt="Serie, Seite 1" />
  <img src="/bilder/serie-02.jpg" alt="Serie, Seite 2" />
  <img src="/bilder/serie-03.jpg" alt="Serie, Seite 3" />
</div>

<style>
  .carousel {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .carousel::-webkit-scrollbar { display: none; }
  .carousel img {
    flex: 0 0 min(78%, 460px);
    scroll-snap-align: center;
    width: 100%;
    height: auto;
    display: block;
  }
</style>
```

Für eine Druck- oder Ansichtsdatei am Stück: in Framely als **PDF** exportieren
(eine Seite je Slide) und verlinken.

---

## Checkliste

- [ ] Entschieden: Werkzeug einbauen (A) oder Ergebnisse zeigen (B)?
- [ ] Bei A: Ordnername festgelegt (z.B. `framely`) und `BASE_PATH` exakt so gesetzt
- [ ] `dist/` vollständig hochgeladen – inklusive `sw.js`, `manifest.webmanifest` und `icons/`
- [ ] Seite läuft über HTTPS
- [ ] Aufgerufen und geprüft: Startbildschirm erscheint, Editor lädt, ein Foto lässt
      sich importieren und ist nach dem Neuladen noch da
- [ ] Auf dem Smartphone geprüft (dort eher verlinken als einbetten)
