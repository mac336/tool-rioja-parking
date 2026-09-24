import { createClient } from '@supabase/supabase-js'

// Cliente del navegador: SOLO la clave pública (anon). La seguridad depende de
// RLS, no de ocultar esta clave (specs/02, specs/11).
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// ---------------------------------------------------------------------------
// LÍMITE DE ESPERA (v1.58.0)
// ---------------------------------------------------------------------------
// Sin esto, una petición que se queda colgada NO falla nunca: no resuelve ni
// rechaza. Y `useAsync` solo reacciona a errores (`.catch(...)`), así que la
// pantalla se queda girando para siempre — es lo que pasaba en Vecinos cuando
// el servidor de Auth de Supabase tenía un pico (se midieron 12-21 s en
// /auth/v1/, con la BD respondiendo en 50-170 ms).
//
// Con un tope, un atasco se convierte en ERROR, y ahí la app ya sabe qué hacer:
// enseña su pantalla de error con botón de reintentar.
const TIMEOUT_MS = 20_000
// Subir una foto de ~800 KB con mala cobertura puede pasar de 20 s sin que sea
// un fallo, así que Storage tiene su propio tope, más holgado.
const TIMEOUT_STORAGE_MS = 90_000

function fetchConTope(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const tope = href.includes('/storage/v1/') ? TIMEOUT_STORAGE_MS : TIMEOUT_MS

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(new DOMException('Tiempo de espera agotado', 'TimeoutError')), tope)

  // Respeta el signal que traiga quien llama (supabase-js cancela algunas
  // peticiones por su cuenta): si aborta el suyo, abortamos el nuestro.
  const propio = init?.signal
  if (propio) {
    if (propio.aborted) ctrl.abort(propio.reason)
    else propio.addEventListener('abort', () => ctrl.abort(propio.reason), { once: true })
  }

  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

export const supabase = createClient(url ?? '', anon ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { fetch: fetchConTope },
})

/** true si la app está configurada para usar el backend real. */
export const usingSupabase = import.meta.env.VITE_DATA_SOURCE === 'supabase' && !!url && !!anon
