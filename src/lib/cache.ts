// Caché en memoria por secciones (solo en modo Supabase).
// ---------------------------------------------------------------------------
// Evita repetir la MISMA consulta a la BD al navegar por la app: cada sección se
// guarda unos minutos (TTL). Mientras esté fresca, `useAsync` la devuelve sin ir
// a la BD. Al ESCRIBIR (crear/editar/borrar) se invalida esa sección (bust) para
// verlo al instante; al volver la app a primer plano se invalidan las volátiles.
//
// Es solo caché de LECTURA en memoria (se pierde al recargar). No cachea datos
// entre usuarios: se limpia al cerrar sesión. En modo demo (mock) NO se activa,
// para que el desarrollo local siempre vea datos frescos.
import { usingSupabase } from '@/lib/supabase'

// TTL por sección (ms). Datos "lentos de cambiar" duran más.
export const TTL = {
  mensajes: 120_000,   // tablón: 2 min
  avisos: 60_000,      // campana: 1 min (más volátil)
  contactos: 600_000,  // 10 min (casi nunca cambian)
  encuestas: 120_000,  // 2 min
  zonas: 600_000,      // 10 min (catálogo de zonas)
  solicitudes: 60_000, // badge de gestión: 1 min
} as const

type Entry = { t: number; data: unknown }
const store = new Map<string, Entry>()

/** Devuelve el valor cacheado si existe y es más nuevo que ttlMs; si no, undefined. */
export function cacheGet<T>(key: string, ttlMs: number): T | undefined {
  if (!usingSupabase) return undefined
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() - e.t > ttlMs) { store.delete(key); return undefined }
  return e.data as T
}

export function cacheSet(key: string, data: unknown): void {
  if (!usingSupabase) return
  store.set(key, { t: Date.now(), data })
}

/** Invalida una o varias secciones (tras escribir). */
export function cacheBust(...keys: string[]): void {
  for (const k of keys) store.delete(k)
}

/** Limpia toda la caché (p. ej. al cerrar sesión). */
export function cacheClear(): void {
  store.clear()
}

/** Igual que cacheGet+fetch+cacheSet, para usar fuera de un hook. */
export async function cachedCall<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const c = cacheGet<T>(key, ttlMs)
  if (c !== undefined) return c
  const d = await fn()
  cacheSet(key, d)
  return d
}
