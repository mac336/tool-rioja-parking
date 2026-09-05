import { defineConfig, devices } from '@playwright/test'

// e2e SIEMPRE en modo mock (sin backend): .env.local trae VITE_DATA_SOURCE=supabase
// para el desarrollo normal, así que aquí lo forzamos por variable de entorno al
// levantar el propio servidor de Playwright (specs/21, RUNBOOK §1).
export default defineConfig({
  testDir: 'tests/e2e',
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:5175',
  },
  webServer: {
    command: 'VITE_DATA_SOURCE=mock npx vite --port 5175',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
  },
  projects: [
    {
      // Chromium (no WebKit): este entorno no tiene las librerías de sistema
      // que necesita WebKit; Chromium con viewport/isMobile de móvil basta
      // para las aserciones de geometría de esta feature.
      name: 'movil',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, isMobile: true },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
})
