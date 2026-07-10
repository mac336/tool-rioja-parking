// Contador de avisos "no vistos" para la campana de la Home.
// Guarda en el dispositivo (localStorage) cuándo se abrió /avisos por última
// vez; los avisos con `ts` posterior cuentan como nuevos. Al abrir la campana
// se marca todo como visto.
import type { Aviso } from '@/lib/api'

const KEY = 'r25-avisos-vistos'

export function marcarAvisosVistos(): void {
  try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* noop */ }
}

export function contarAvisosNuevos(avisos: Aviso[]): number {
  let desde = ''
  try { desde = localStorage.getItem(KEY) ?? '' } catch { /* noop */ }
  if (!desde) return avisos.length
  return avisos.filter((a) => a.ts > desde).length
}
