// Consejos de convivencia del hueco de la Home (mig. 0064).
// Son NORMAS REALES de la comunidad, editables desde Gestión para no tener que
// desplegar por cambiar una coma. Cada uno tiene versión corta (1 línea) y, a
// veces, larga (2), y el bloque elige según el hueco que tenga cada móvil.
import { supabase } from '@/lib/supabase'
import type { Consejo } from '@/types'

/** 'MM-DD' de hoy, para la ventana de temporada (p. ej. consejos de piscina). */
const hoyMMDD = (): string => {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ¿Toca hoy? Sin ventana → siempre. La ventana puede cruzar el fin de año
 *  (p. ej. 12-15 a 01-07), y entonces la comparación se invierte. */
export function enTemporada(c: Consejo, hoy = hoyMMDD()): boolean {
  const { visible_desde: d, visible_hasta: h } = c
  if (!d || !h) return true
  return d <= h ? hoy >= d && hoy <= h : hoy >= d || hoy <= h
}

/** Consejos ACTIVOS y en temporada, en su orden. Los ve cualquier vecino activo. */
export async function listConsejos(): Promise<Consejo[]> {
  const { data, error } = await supabase.from('consejos_convivencia')
    .select('*').eq('activo', true).order('orden', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Consejo[]).filter((c) => enTemporada(c))
}

/** Todos, incluidos los apagados y fuera de temporada (pantalla de gestión). */
export async function listConsejosGestion(): Promise<Consejo[]> {
  const { data, error } = await supabase.from('consejos_convivencia')
    .select('*').order('orden', { ascending: true })
  if (error) throw error
  return (data ?? []) as Consejo[]
}

export type ConsejoInput = Pick<Consejo, 'texto_corto' | 'texto_largo' | 'icono' | 'orden' | 'activo' | 'visible_desde' | 'visible_hasta'>

export async function crearConsejo(input: ConsejoInput): Promise<void> {
  const { error } = await supabase.from('consejos_convivencia').insert(input)
  if (error) throw error
}
export async function editarConsejo(id: string, input: Partial<ConsejoInput>): Promise<void> {
  const { error } = await supabase.from('consejos_convivencia').update(input).eq('id', id)
  if (error) throw error
}
export async function borrarConsejo(id: string): Promise<void> {
  const { error } = await supabase.from('consejos_convivencia').delete().eq('id', id)
  if (error) throw error
}
