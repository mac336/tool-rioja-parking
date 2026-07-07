// Reservas y zonas comunes — implementación real (Supabase). RLS decide qué
// filas ve cada rol; los constraints de BD (anti-solape, 1 vigente/vivienda)
// se dejan propagar como error. Firmas idénticas al mock (src/lib/apiMock.ts).
import { supabase } from '@/lib/supabase'
import type { Reserva, ZonaComun } from '@/types'

// franja_min/franja_max llegan como `time` ('09:00:00') → recortar a 'HH:MM'.
const hhmm = (t?: string | null): string | undefined => (t ? t.slice(0, 5) : undefined)

// Fila de reservas con la zona embebida vía join (para zona_nombre plano).
interface ReservaRow extends Omit<Reserva, 'zona_nombre'> {
  zona?: { nombre: string } | null
}
const toReserva = (row: ReservaRow): Reserva => {
  const { zona, ...rest } = row
  return { ...rest, zona_nombre: zona?.nombre ?? '' }
}
const RESERVA_SELECT = '*, zona:zonas_comunes(nombre)'

/** Usuario autenticado + su vivienda (desde profiles). */
async function sesion(): Promise<{ userId: string; vivienda: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('profiles')
    .select('vivienda').eq('id', user.id).single()
  if (error) throw error
  return { userId: user.id, vivienda: data.vivienda as string }
}

// ---- Zonas -------------------------------------------------------------------
export async function listZonas(): Promise<ZonaComun[]> {
  const { data, error } = await supabase.from('zonas_comunes')
    .select('*').eq('activa', true).order('orden')
  if (error) throw error
  return (data ?? []).map((z) => ({
    ...z,
    franja_min: hhmm(z.franja_min),
    franja_max: hhmm(z.franja_max),
  })) as ZonaComun[]
}

// ---- Reservas del usuario ----------------------------------------------------
export async function misReservas(): Promise<Reserva[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .eq('solicitada_por', user.id)
    .order('inicio', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => toReserva(r as ReservaRow))
}

/** Reserva vigente de la vivienda del usuario (pendiente/aprobada, fin>=now). */
export async function reservaVigente(): Promise<Reserva | null> {
  const { vivienda } = await sesion()
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .eq('vivienda', vivienda)
    .in('estado', ['pendiente', 'aprobada'])
    .gte('fin', new Date().toISOString())
    .order('inicio', { ascending: true })
    .limit(1)
  if (error) throw error
  const row = (data ?? [])[0]
  return row ? toReserva(row as ReservaRow) : null
}

/** Ocupación de una zona en un día, SIN identidad (vista ocupacion_reservas). */
export async function ocupacionZonaDia(
  zonaId: string,
  fechaISO: string,
): Promise<{ inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[]> {
  const dia = fechaISO.slice(0, 10)
  const { data, error } = await supabase.from('ocupacion_reservas')
    .select('zona_id, inicio, fin, estado')
    .eq('zona_id', zonaId)
  if (error) throw error
  return (data ?? [])
    .filter((r) => (r.inicio as string).slice(0, 10) === dia)
    .map((r) => ({ inicio: r.inicio as string, fin: r.fin as string, estado: r.estado as 'pendiente' | 'aprobada' }))
}

// ---- Crear / cancelar --------------------------------------------------------
export async function crearReserva(input: {
  zonaId: string; inicio: string; fin: string; numInvitados: number
}): Promise<Reserva> {
  const { userId, vivienda } = await sesion()
  const { data, error } = await supabase.from('reservas')
    .insert({
      zona_id: input.zonaId,
      vivienda,
      solicitada_por: userId,
      inicio: input.inicio,
      fin: input.fin,
      num_invitados: input.numInvitados,
      estado: 'pendiente',
    })
    .select(RESERVA_SELECT)
    .single()
  if (error) throw error // constraints (no solape, 1 vigente/vivienda) se propagan
  return toReserva(data as ReservaRow)
}

export async function cancelarReserva(id: string): Promise<void> {
  const { error } = await supabase.from('reservas')
    .update({ estado: 'cancelada' }).eq('id', id)
  if (error) throw error
}

// ---- Gestión (cola del presidente) ------------------------------------------
export async function reservasPendientesGestion(): Promise<(Reserva & { nombre?: string })[]> {
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .eq('estado', 'pendiente')
    .order('inicio', { ascending: true })
  if (error) throw error
  const reservas = (data ?? []).map((r) => toReserva(r as ReservaRow))

  // Nombre del solicitante vía vista `directorio` (id → nombre), para mostrar quién pide.
  const ids = [...new Set(reservas.map((r) => r.solicitada_por))]
  const nombrePorId = new Map<string, string>()
  if (ids.length > 0) {
    const { data: dir, error: dirErr } = await supabase.from('directorio')
      .select('id, nombre').in('id', ids)
    if (dirErr) throw dirErr
    for (const d of dir ?? []) nombrePorId.set(d.id as string, d.nombre as string)
  }
  return reservas.map((r) => ({ ...r, nombre: nombrePorId.get(r.solicitada_por) }))
}

export async function resolverReserva(id: string, aprobar: boolean, motivo?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('reservas')
    .update({
      estado: aprobar ? 'aprobada' : 'rechazada',
      motivo_rechazo: motivo ?? null,
      aprobada_por: user.id,
    })
    .eq('id', id)
  if (error) throw error
}
