/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// `vite build --mode artifact` makes a single-file preview (see scripts/build-artifact.mjs):
// no service worker, and every font/image inlined.
export default defineConfig(({ mode }) => ({
  // Relative base so the build works from any folder or static host.
  base: './',
  ...(mode === 'artifact' && {
    resolve: { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-stub.ts', import.meta.url)) } },
    build: { outDir: 'dist-artifact', assetsInlineLimit: 100_000_000, cssCodeSplit: false },
  }),
  plugins: [
    react(),
    tailwindcss(),
    mode !== 'artifact' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'audio/*.mp3'],
      manifest: {
        name: 'Yiga Oluganda',
        short_name: 'Yiga',
        description: 'Learn Luganda with Ngaali the crane',
        lang: 'sv',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6efe4',
        theme_color: '#0e6f73',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json,mp3}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
}))
