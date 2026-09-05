// Calendario (festivos de Madrid + fechas de la comunidad) — implementación
// real (Supabase). Patrón db/reservas.ts: la RLS decide qué se puede escribir
// (cal_sel deja leer a cualquier cuenta activa; cal_ins/cal_upd/cal_del exigen
// el permiso 'gestionar_calendario'), las constraints de BD se propagan como
// error. Firmas idénticas al mock (src/lib/apiMock.ts). specs/21.
import { supabase } from '@/lib/supabase'
import { cacheBust } from '@/lib/cache'
import type { EventoCalendario, TipoEvento } from '@/types'

export interface EventoCalendarioInput {
  tipo: TipoEvento
  titulo: string
  fecha: string
  fecha_fin?: string | null
  nota?: string | null
  fuente?: string | null
}

/** Todas las filas (sin paginación en v1, volumen ínfimo), fecha asc, título asc. */
export async function listEventos(): Promise<EventoCalendario[]> {
  const { data, error } = await supabase.from('calendario_eventos')
    .select('*').order('fecha', { ascending: true }).order('titulo', { ascending: true })
  if (error) throw error
  return (data ?? []) as EventoCalendario[]
}

/** created_by = auth.uid() (la RLS lo exige: cal_ins comprueba created_by = auth.uid()). */
export async function crearEvento(input: EventoCalendarioInput): Promise<EventoCalendario> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('calendario_eventos')
    .insert({
      tipo: input.tipo,
      titulo: input.titulo,
      fecha: input.fecha,
      fecha_fin: input.fecha_fin ?? null,
      nota: input.nota ?? null,
      fuente: input.fuente ?? null,
      created_by: user.id,
    })
    .select('*').single()
  if (error) throw error
  cacheBust('calendario')
  return data as EventoCalendario
}

export async function editarEvento(id: string, patch: Partial<EventoCalendarioInput>): Promise<void> {
  const { error } = await supabase.from('calendario_eventos').update(patch).eq('id', id)
  if (error) throw error
  cacheBust('calendario')
}

export async function borrarEvento(id: string): Promise<void> {
  const { error } = await supabase.from('calendario_eventos').delete().eq('id', id)
  if (error) throw error
  cacheBust('calendario')
}
