/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/jap-itinerario/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Giappone 2027',
        short_name: 'Giappone',
        description: 'Itinerario e compagno di viaggio per il Giappone',
        lang: 'it',
        start_url: '/jap-itinerario/#/oggi',
        scope: '/jap-itinerario/',
        display: 'standalone',
        background_color: '#F6F1E7',
        theme_color: '#F6F1E7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Tenendo premuta l'icona (Android): Oggi, e una spesa nuova col foglio già aperto.
        shortcuts: [
          { name: 'Oggi', short_name: 'Oggi', url: '/jap-itinerario/#/oggi', icons: [{ src: 'scorciatoia-oggi-96.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Aggiungi spesa', short_name: 'Spesa', url: '/jap-itinerario/#/spese/nuova', icons: [{ src: 'scorciatoia-spesa-96.png', sizes: '96x96', type: 'image/png' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'CacheFirst',
            options: { cacheName: 'mappe', expiration: { maxEntries: 4000, purgeOnQuotaError: true, maxAgeSeconds: 60 * 60 * 24 * 30 }, cacheableResponse: { statuses: [200] } },
          },
          {
            // Solo le immagini: le chiamate alle API di Commons (commons.wikimedia.org) non vanno in questa cache.
            urlPattern: ({ request, url }) => request.destination === 'image' && (url.hostname === 'upload.wikimedia.org' || url.hostname === 'thumb.wikimedia.org'),
            handler: 'CacheFirst',
            options: { cacheName: 'foto', expiration: { maxEntries: 800, purgeOnQuotaError: true, maxAgeSeconds: 60 * 60 * 24 * 180 }, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
