/// <reference types="node" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { readFileSync } from 'node:fs'

// Versión de la app = la de package.json. Se SUBE en cada despliegue (ver
// CLAUDE.md → Forma de trabajo) y se muestra en la pantalla de bienvenida.
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }

// PWA: cachea SOLO la App Shell (estáticos). NUNCA datos de Supabase
// (módulo 10/11 de las specs): las llamadas a la API se dejan network-only.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // El proyecto vive en /mnt/c (disco Windows montado en WSL): los eventos de
  // cambio de archivo no cruzan esa frontera, así que HMR no se entera. Con
  // polling Vite detecta los cambios y recarga en caliente.
  server: {
    watch: { usePolling: true, interval: 300 },
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' + registro manual (src/lib/pwaUpdate.ts): la versión nueva queda
      // en espera y la aplicamos nosotros con la pantalla "Instalando actualización…"
      // (al pulsar Inicio o al volver la app a primer plano). Así no hay que cerrar
      // del todo la app para ver los cambios.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Rioja 25 — Comunidad',
        short_name: 'Rioja 25',
        description: 'App de la comunidad de vecinos Rioja 25',
        lang: 'es-ES',
        theme_color: '#2BB0C0',
        background_color: '#F1F4F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // El SW generado importa nuestro handler de notificaciones push.
        importScripts: ['push-sw.js'],
        // Datos sensibles: NO cachear las respuestas de Supabase.
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
})
