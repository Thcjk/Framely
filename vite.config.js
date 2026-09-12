import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite-Konfiguration.
 *
 * `base` muss beim Deployment auf GitHub Pages dem Repository-Namen entsprechen,
 * weil die Seite unter https://<user>.github.io/<repo>/ ausgeliefert wird.
 * Über die Umgebungsvariable BASE_PATH lässt sich das überschreiben
 * (z.B. "/" für eine eigene Domain).
 */
const base = process.env.BASE_PATH ?? '/amarchitects/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Der Service Worker aktualisiert sich selbst, sobald eine neue Version deployed wurde.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Framely – Foto-Layouts & Druck',
        short_name: 'Framely',
        description:
          'Fotos zu Layouts anordnen, rahmen und als Bild, PDF oder Druckdatei exportieren. Läuft komplett im Browser.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#111111',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Alle Build-Assets werden vorab gecacht -> Editor funktioniert offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
      },
      devOptions: { enabled: false },
    }),
  ],
})
