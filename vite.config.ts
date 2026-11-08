import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Application installable qui fonctionne sans internet : tout est gardé sur l'ordinateur après la première ouverture.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Sonaltech Électrique — Gestion',
        short_name: 'Sonaltech',
        description: 'Devis, factures, attachements, pointage et frais — fonctionne sans internet.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1f33',
        theme_color: '#0b1f33',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: '/index.html' },
    }),
  ],
})
