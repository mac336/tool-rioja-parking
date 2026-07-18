// Reservas y zonas comunes — implementación real (Supabase). RLS decide qué
// filas ve cada rol; los constraints de BD (anti-solape por zona, fin>inicio) se
// dejan propagar como error. Una reserva puede abarcar VARIAS zonas en el mismo
// horario: son N filas que comparten `grupo_id` y se gestionan en bloque.
// Firmas idénticas al mock (src/lib/apiMock.ts).
import { supabase } from '@/lib/supabase'
import { cacheBust } from '@/lib/cache'
import { getConfig } from './config'
import type { Reserva, ReservaGrupo, CrearReservaInput, ZonaComun } from '@/types'

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

const claveGrupo = (r: Reserva) => r.grupo_id ?? r.id

/** Colapsa filas de reservas en grupos (un grupo = un horario, 1..n zonas). */
function agrupar(rows: Reserva[]): ReservaGrupo[] {
  const porGrupo = new Map<string, Reserva[]>()
  for (const r of rows) {
    const k = claveGrupo(r)
    if (!porGrupo.has(k)) porGrupo.set(k, [])
    porGrupo.get(k)!.push(r)
  }
  return [...porGrupo.entries()].map(([grupo_id, rs]) => {
    const base = rs[0]
    return {
      grupo_id,
      ids: rs.map((r) => r.id),
      zonas: rs.map((r) => ({ id: r.zona_id, nombre: r.zona_nombre })),
      vivienda: base.vivienda,
      solicitada_por: base.solicitada_por,
      inicio: base.inicio,
      fin: base.fin,
      num_invitados: base.num_invitados,
      estado: base.estado,
      motivo_rechazo: base.motivo_rechazo,
      created_at: base.created_at,
    } as ReservaGrupo
  })
}

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

// ---- Reservas del usuario (agrupadas) ----------------------------------------
export async function misReservas(): Promise<ReservaGrupo[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .eq('solicitada_por', user.id)
    .order('inicio', { ascending: false })
  if (error) throw error
  return agrupar((data ?? []).map((r) => toReserva(r as ReservaRow)))
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
}

/** Grupo de reserva vigente de la vivienda (pendiente/aprobada, fin>=ahora). */
export async function reservaVigente(): Promise<ReservaGrupo | null> {
  const { vivienda } = await sesion()
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .eq('vivienda', vivienda)
    .in('estado', ['pendiente', 'aprobada'])
    .gte('fin', new Date().toISOString())
    .order('inicio', { ascending: true })
  if (error) throw error
  const grupos = agrupar((data ?? []).map((r) => toReserva(r as ReservaRow)))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  return grupos[0] ?? null
}

/** Ocupación de TODAS las zonas en un día (para validar varias zonas a la vez). */
export async function ocupacionDia(
  fechaISO: string,
): Promise<{ zona_id: string; inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[]> {
  const dia = fechaISO.slice(0, 10)
  const { data, error } = await supabase.from('ocupacion_reservas')
    .select('zona_id, inicio, fin, estado')
  if (error) throw error
  return (data ?? [])
    .filter((r) => (r.inicio as string).slice(0, 10) === dia)
    .map((r) => ({
      zona_id: r.zona_id as string, inicio: r.inicio as string,
      fin: r.fin as string, estado: r.estado as 'pendiente' | 'aprobada',
    }))
}

// ---- Crear / cancelar --------------------------------------------------------
export async function crearReserva(input: CrearReservaInput): Promise<ReservaGrupo> {
  if (input.zonaIds.length === 0) throw new Error('Selecciona al menos una zona.')
  const { userId, vivienda } = await sesion()
  // Estado inicial según el flag app_config.reservas_requieren_aprobacion:
  //  · false (por defecto) → 'aprobada' al instante (aprobación directa).
  //  · true → 'pendiente' + aviso a la gestión (cola de aprobación).
  // Con 'reservar_otras_viviendas' se puede reservar a nombre de otra vivienda
  // (la RLS lo verifica y exige que sea un piso real); si no, es la propia.
  const { reservas_requieren_aprobacion } = await getConfig()
  const estado = reservas_requieren_aprobacion ? 'pendiente' as const : 'aprobada' as const
  const viviendaReserva = input.viviendaObjetivo?.trim() || vivienda
  const grupo_id = crypto.randomUUID()
  const filas = input.zonaIds.map((zonaId) => ({
    grupo_id,
    zona_id: zonaId,
    vivienda: viviendaReserva,
    solicitada_por: userId,
    inicio: input.inicio,
    fin: input.fin,
    num_invitados: input.numInvitados,
    estado,
  }))
  // Un único INSERT con array → transacción atómica: si una zona solapa, el
  // constraint reservas_no_solapan aborta TODO el grupo (no quedan a medias).
  const { data, error } = await supabase.from('reservas')
    .insert(filas).select(RESERVA_SELECT)
  if (error) {
    if (error.code === '23P01') throw new Error('Ese horario ya está ocupado en alguna de las zonas elegidas.')
    throw error
  }
  // Si nace pendiente, avisa a la gestión (best-effort; la reserva ya está creada).
  if (estado === 'pendiente') {
    void supabase.functions.invoke('notificar', { body: { kind: 'reserva_nueva', id: grupo_id } }).catch(() => undefined)
  }
  // Aviso de reserva del JARDÍN a quien tenga el permiso (el servidor comprueba
  // si el grupo incluye el jardín; se envía también en aprobación directa).
  void supabase.functions.invoke('notificar', { body: { kind: 'reserva_jardin', id: grupo_id } }).catch(() => undefined)
  cacheBust('avisos')
  return agrupar((data ?? []).map((r) => toReserva(r as ReservaRow)))[0]
}

const UUID_RE = /^[0-9a-fA-F-]{36}$/
/** Cancela un grupo entero (todas sus zonas). */
export async function cancelarReserva(grupoId: string): Promise<void> {
  if (!UUID_RE.test(grupoId)) throw new Error('Identificador de reserva no válido.')
  const { error } = await supabase.from('reservas')
    .update({ estado: 'cancelada' })
    .or(`grupo_id.eq.${grupoId},id.eq.${grupoId}`)
  if (error) throw error
  cacheBust('avisos')
}

// ---- Gestión (cola del presidente) ------------------------------------------
// Adjunta el nombre del solicitante (vía vista `directorio`, id → nombre) a cada grupo.
async function conNombres(grupos: ReservaGrupo[]): Promise<ReservaGrupo[]> {
  const ids = [...new Set(grupos.map((g) => g.solicitada_por))]
  if (ids.length === 0) return grupos
  const { data: dir, error } = await supabase.from('directorio')
    .select('id, nombre').in('id', ids)
  if (error) throw error
  const nombrePorId = new Map<string, string>()
  for (const d of dir ?? []) nombrePorId.set(d.id as string, d.nombre as string)
  return grupos.map((g) => ({ ...g, nombre: nombrePorId.get(g.solicitada_por) }))
}

/** Cola de reservas PENDIENTES (para aprobar). Vacía si la aprobación está
 *  desactivada (no se crean pendientes). */
export async function reservasPendientesGestion(): Promise<ReservaGrupo[]> {
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .eq('estado', 'pendiente')
    .order('inicio', { ascending: true })
  if (error) throw error
  return conNombres(agrupar((data ?? []).map((r) => toReserva(r as ReservaRow))))
}

/** Reservas (pendientes + aprobadas) cuyo inicio cae en [desdeISO, hastaISO).
 *  Para la agenda mensual. */
export async function reservasGestion(desdeISO: string, hastaISO: string): Promise<ReservaGrupo[]> {
  const { data, error } = await supabase.from('reservas')
    .select(RESERVA_SELECT)
    .in('estado', ['pendiente', 'aprobada'])
    .gte('inicio', desdeISO)
    .lt('inicio', hastaISO)
    .order('inicio', { ascending: true })
  if (error) throw error
  const grupos = agrupar((data ?? []).map((r) => toReserva(r as ReservaRow)))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  return conNombres(grupos)
}

/** Aprobar/rechazar un grupo de reserva pendiente (gestión). */
export async function resolverReserva(grupoId: string, aprobar: boolean, motivo?: string): Promise<void> {
  if (!UUID_RE.test(grupoId)) throw new Error('Identificador de reserva no válido.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('reservas')
    .update({ estado: aprobar ? 'aprobada' : 'rechazada', motivo_rechazo: motivo ?? null, aprobada_por: user.id })
    .or(`grupo_id.eq.${grupoId},id.eq.${grupoId}`)
  if (error) throw error
  // Avisar al solicitante (best-effort).
  void supabase.functions.invoke('notificar-reserva', { body: { grupoId, aprobar } }).catch(() => undefined)
  cacheBust('avisos')
}

export interface EstadisticasReservas {
  aprobadasMes: number
  aprobadasAnio: number
  canceladasAnio: number
  totalAnio: number
  ranking: { nombre: string; veces: number }[]
}

/** Estadísticas de reservas para el dashboard de gestión (RLS: es_gestion ve
 *  todas). Cuenta por GRUPO (una reserva multi-zona = 1). Buckets por año/mes
 *  según la fecha de la reserva (inicio), Europe/Madrid. */
export async function estadisticasReservas(): Promise<EstadisticasReservas> {
  const { data, error } = await supabase.from('reservas')
    .select('grupo_id, id, solicitada_por, inicio, estado')
  if (error) throw error

  // Colapsar a grupos (un grupo = una reserva).
  const grupos = new Map<string, { solicitada_por: string; inicio: string; estado: string }>()
  for (const r of data ?? []) {
    const k = (r.grupo_id as string) ?? (r.id as string)
    if (!grupos.has(k)) grupos.set(k, { solicitada_por: r.solicitada_por as string, inicio: r.inicio as string, estado: r.estado as string })
  }

  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth()
  const yearOf = (iso: string) => new Date(iso).getFullYear()
  const monthOf = (iso: string) => new Date(iso).getMonth()

  let aprobadasMes = 0, aprobadasAnio = 0, canceladasAnio = 0, totalAnio = 0
  const veces = new Map<string, number>()
  for (const g of grupos.values()) {
    if (yearOf(g.inicio) !== anio) continue
    totalAnio++
    if (g.estado === 'cancelada') canceladasAnio++
    if (g.estado === 'aprobada') {
      aprobadasAnio++
      if (monthOf(g.inicio) === mes) aprobadasMes++
    }
    // Ranking: cuántas reservas ha hecho cada vivienda/persona este año (excluye canceladas).
    if (g.estado !== 'cancelada') veces.set(g.solicitada_por, (veces.get(g.solicitada_por) ?? 0) + 1)
  }

  // Nombres de los solicitantes vía directorio.
  const ids = [...veces.keys()]
  const nombrePorId = new Map<string, string>()
  if (ids.length > 0) {
    const { data: dir } = await supabase.from('directorio').select('id, nombre').in('id', ids)
    for (const d of dir ?? []) nombrePorId.set(d.id as string, d.nombre as string)
  }
  const ranking = [...veces.entries()]
    .map(([id, n]) => ({ nombre: nombrePorId.get(id) ?? 'Vecino', veces: n }))
    .sort((a, b) => b.veces - a.veces)

  return { aprobadasMes, aprobadasAnio, canceladasAnio, totalAnio, ranking }
}

