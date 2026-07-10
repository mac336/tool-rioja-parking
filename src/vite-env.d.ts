/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_TURNSTILE_SITE_KEY: string
  readonly VITE_DATA_SOURCE: 'mock' | 'supabase'
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Versión de la app (package.json), inyectada por Vite en el build. */
declare const __APP_VERSION__: string
