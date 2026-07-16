import { useEffect, useState, useCallback } from 'react'
import type { LoadState } from '@/types'
import { cacheGet, cacheSet } from '@/lib/cache'

/** Hook simple de carga async con estados loading/empty/error/ready y refetch.
 *
 *  Caché opcional (`opts.key` + `opts.ttlMs`): mientras el valor cacheado esté
 *  fresco, se devuelve SIN llamar a `fn` (evita repetir la misma consulta a la BD
 *  al navegar). `refetch()` siempre ignora la caché y trae datos frescos. La
 *  caché solo actúa en modo Supabase (ver src/lib/cache.ts). Úsalo únicamente en
 *  lecturas sin `deps` variables (una misma key = un mismo resultado). */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts?: { key?: string; ttlMs?: number },
) {
  const key = opts?.key
  const ttlMs = opts?.ttlMs ?? 0
  const inicial = key ? cacheGet<T>(key, ttlMs) : undefined
  const esVacio = (d: unknown) => Array.isArray(d) && d.length === 0

  const [data, setData] = useState<T | null>(inicial ?? null)
  const [state, setState] = useState<LoadState>(
    inicial !== undefined ? (esVacio(inicial) ? 'empty' : 'ready') : 'loading',
  )

  const run = useCallback((force = false) => {
    // Caché fresca (y no forzamos) → úsala sin ir a la BD.
    if (!force && key) {
      const c = cacheGet<T>(key, ttlMs)
      if (c !== undefined) {
        setData(c)
        setState(esVacio(c) ? 'empty' : 'ready')
        return () => { /* nada que limpiar */ }
      }
    }
    let alive = true
    setState('loading')
    fn()
      .then((d) => {
        if (!alive) return
        if (key) cacheSet(key, d)
        setData(d)
        setState(esVacio(d) ? 'empty' : 'ready')
      })
      .catch(() => alive && setState('error'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])

  return { data, state, refetch: () => run(true), setData }
}
