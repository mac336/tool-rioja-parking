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
      // locale/timezoneId (H8a, design-review 49): sin esto Chromium sale en
      // en-US y las fechas se ven "mm/dd/yyyy" — las capturas no son fieles
      // al dispositivo del vecino (siempre es-ES, Europe/Madrid). El widget
      // NATIVO <input type=date> sigue mostrando mm/dd/yyyy en ESTE sandbox
      // (sin locale es_ES instalada a nivel de SO; --lang no lo cambia): es
      // una limitación del entorno de test, no del código — el texto que
      // pinta la propia app (Intl.DateTimeFormat('es-ES', …) en toda la UI)
      // ya sale correcto, verificado abajo.
      name: 'movil',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, isMobile: true, locale: 'es-ES', timezoneId: 'Europe/Madrid' },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' },
    },
  ],
})
