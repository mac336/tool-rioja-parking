// Incidencias — implementación real (Supabase). CRUD + comentarios + moderación
// + historial de estado. La seguridad la gatea RLS (0003) y los triggers (0002):
// el autor/vivienda y el estado inicial los rellena BD; los eventos de estado se
// registran solos al cambiar `estado`.
//
// Nombres de autor: NO se hace join a `profiles` (RLS lo bloquea entre viviendas).
// Se lee la vista `directorio` (id, nombre, vivienda, rol) a un Map y se resuelve
// desde ahí. Los comentarios ocultos ya vienen filtrados por RLS; `oculto` se
// mapea tal cual (gestión sí los ve).
import { supabase } from '@/lib/supabase'
import { urlFirmada } from './storage'
import type {
  Incident, IncidentComment, IncidentEvent, IncidentStatus, IncidentCategory, Role,
} from '@/types'

// ---- Directorio (resolución de nombres/roles sin join a profiles) ------------
interface DirectorioRow { id: string; nombre: string; vivienda: string | null; rol: Role }

async function cargarDirectorio(): Promise<Map<string, DirectorioRow>> {
  const { data, error } = await supabase.from('directorio').select('*')
  if (error) throw error
  const map = new Map<string, DirectorioRow>()
  for (const row of (data ?? []) as DirectorioRow[]) map.set(row.id, row)
  return map
}

const nombreConVivienda = (d?: DirectorioRow): { nombre: string; vivienda: string } => {
  const nombre = d?.nombre ?? '—'
  const vivienda = d?.vivienda ?? ''
  return { nombre: vivienda ? `${nombre} (${vivienda})` : nombre, vivienda }
}

// ---- Filas de BD -------------------------------------------------------------
interface IncidenciaRow {
  id: string; autor_id: string; autor_vivienda: string | null
  titulo: string; descripcion: string; categoria: IncidentCategory; ubicacion: string | null
  estado: IncidentStatus; comentarios_bloqueados: boolean; created_at: string
}
interface ComentarioRow {
  id: string; incidencia_id: string; autor_id: string; texto: string; oculto: boolean; created_at: string
}
interface EventoRow {
  id: string; incidencia_id: string; estado_anterior: IncidentStatus | null
  estado_nuevo: IncidentStatus; actor_id: string | null; created_at: string
}

function mapComentario(row: ComentarioRow, dir: Map<string, DirectorioRow>): IncidentComment {
  const d = dir.get(row.autor_id)
  return {
    id: row.id,
    autor_id: row.autor_id,
    autor_nombre: d?.nombre ?? '—',
    autor_rol: d?.rol ?? 'vecino',
    texto: row.texto,
    oculto: row.oculto,
    created_at: row.created_at,
  }
}

function mapEvento(row: EventoRow, dir: Map<string, DirectorioRow>): IncidentEvent {
  return {
    id: row.id,
    estado_anterior: row.estado_anterior,
    estado_nuevo: row.estado_nuevo,
    actor_nombre: (row.actor_id && dir.get(row.actor_id)?.nombre) || '—',
    created_at: row.created_at,
  }
}

function mapIncidencia(
  row: IncidenciaRow,
  dir: Map<string, DirectorioRow>,
  comentarios: IncidentComment[],
  eventos: IncidentEvent[],
  fotos: string[],
): Incident {
  const autor = nombreConVivienda(dir.get(row.autor_id))
  return {
    id: row.id,
    autor_id: row.autor_id,
    autor_nombre: autor.nombre,
    autor_vivienda: row.autor_vivienda ?? autor.vivienda,
    titulo: row.titulo,
    descripcion: row.descripcion,
    categoria: row.categoria,
    ubicacion: row.ubicacion ?? undefined,
    estado: row.estado,
    comentarios_bloqueados: row.comentarios_bloqueados,
    fotos,
    comentarios,
    eventos,
    created_at: row.created_at,
  }
}

// ---- Listado -----------------------------------------------------------------
export async function listIncidencias(): Promise<Incident[]> {
  // Feed compartido: solo las incidencias ya moderadas + las propias del autor
  // (para que vea el estado de las suyas, incluidas pendiente/rechazada). La RLS
  // ya oculta las pendientes ajenas; este filtro además las quita de la lista de
  // gestión para que la moderación viva en su cola, no mezclada en el feed.
  const { data: { user } } = await supabase.auth.getUser()
  let query = supabase.from('incidencias').select('*').order('created_at', { ascending: false })
  const publicas = 'estado.in.(abierta,en_curso,resuelta,cerrada)'
  query = user ? query.or(`${publicas},autor_id.eq.${user.id}`) : query.or(publicas)
  const { data: incRows, error } = await query
  if (error) throw error
  const incidencias = (incRows ?? []) as IncidenciaRow[]
  if (incidencias.length === 0) return []

  const ids = incidencias.map((i) => i.id)
  const [dir, comRes] = await Promise.all([
    cargarDirectorio(),
    supabase.from('incidencia_comentarios').select('*').in('incidencia_id', ids),
  ])
  if (comRes.error) throw comRes.error

  const porIncidencia = new Map<string, IncidentComment[]>()
  for (const row of (comRes.data ?? []) as ComentarioRow[]) {
    const list = porIncidencia.get(row.incidencia_id) ?? []
    list.push(mapComentario(row, dir))
    porIncidencia.set(row.incidencia_id, list)
  }

  return incidencias.map((row) =>
    mapIncidencia(row, dir, porIncidencia.get(row.id) ?? [], [], []))
}

// ---- Detalle -----------------------------------------------------------------
export async function getIncidencia(id: string): Promise<Incident | null> {
  const { data: incRow, error } = await supabase
    .from('incidencias').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!incRow) return null

  const [dir, comRes, evRes, adjRes] = await Promise.all([
    cargarDirectorio(),
    supabase.from('incidencia_comentarios').select('*')
      .eq('incidencia_id', id).order('created_at', { ascending: true }),
    supabase.from('incidencia_eventos').select('*')
      .eq('incidencia_id', id).order('created_at', { ascending: true }),
    supabase.from('incidencia_adjuntos').select('path')
      .eq('incidencia_id', id).order('created_at', { ascending: true }),
  ])
  if (comRes.error) throw comRes.error
  if (evRes.error) throw evRes.error
  if (adjRes.error) throw adjRes.error

  const comentarios = ((comRes.data ?? []) as ComentarioRow[]).map((r) => mapComentario(r, dir))
  const eventos = ((evRes.data ?? []) as EventoRow[]).map((r) => mapEvento(r, dir))
  const paths = ((adjRes.data ?? []) as { path: string }[]).map((r) => r.path)
  // Sirve los adjuntos privados con URL firmada (caducidad corta).
  const fotos = (await Promise.all(paths.map((p) => urlFirmada(p)))).filter(Boolean)

  return mapIncidencia(incRow as IncidenciaRow, dir, comentarios, eventos, fotos)
}

// ---- Crear / editar / borrar -------------------------------------------------
export async function crearIncidencia(input: {
  titulo: string; descripcion: string; categoria: IncidentCategory; ubicacion?: string; fotos?: string[]
}): Promise<Incident> {
  // autor_id / autor_vivienda / estado los rellena el trigger BEFORE INSERT.
  const { data, error } = await supabase.from('incidencias').insert({
    titulo: input.titulo,
    descripcion: input.descripcion,
    categoria: input.categoria,
    ubicacion: input.ubicacion ?? null,
  }).select('id').single()
  if (error) throw error
  const inc = await getIncidencia((data as { id: string }).id)
  if (!inc) throw new Error('No se pudo leer la incidencia recién creada.')
  return inc
}

export async function editarIncidencia(id: string, input: {
  titulo: string; descripcion: string; categoria: IncidentCategory; ubicacion?: string
}): Promise<Incident> {
  const { error } = await supabase.from('incidencias').update({
    titulo: input.titulo,
    descripcion: input.descripcion,
    categoria: input.categoria,
    ubicacion: input.ubicacion ?? null,
  }).eq('id', id)
  if (error) throw error
  const inc = await getIncidencia(id)
  if (!inc) throw new Error('Incidencia no encontrada tras editar.')
  return inc
}

export async function borrarIncidencia(id: string): Promise<void> {
  const { error } = await supabase.from('incidencias').delete().eq('id', id)
  if (error) throw error
}

// ---- Comentarios -------------------------------------------------------------
export async function comentarIncidencia(id: string, texto: string): Promise<IncidentComment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('incidencia_comentarios').insert({
    incidencia_id: id,
    autor_id: user.id,
    texto,
  }).select('*').single()
  if (error) throw error
  const dir = await cargarDirectorio()
  return mapComentario(data as ComentarioRow, dir)
}

export async function ocultarComentario(incId: string, comId: string, oculto = true): Promise<void> {
  const { error } = await supabase.from('incidencia_comentarios')
    .update({ oculto }).eq('id', comId).eq('incidencia_id', incId)
  if (error) throw error
}

export async function bloquearComentarios(id: string, bloqueado: boolean): Promise<void> {
  const { error } = await supabase.from('incidencias')
    .update({ comentarios_bloqueados: bloqueado }).eq('id', id)
  if (error) throw error
}

// ---- Estado (un trigger registra el evento) ----------------------------------
export async function cambiarEstadoIncidencia(id: string, estado: IncidentStatus): Promise<Incident> {
  const { error } = await supabase.from('incidencias').update({ estado }).eq('id', id)
  if (error) throw error
  const inc = await getIncidencia(id)
  if (!inc) throw new Error('Incidencia no encontrada tras cambiar estado.')
  return inc
}

// ---- Moderación (cola de aprobación de gestión) ------------------------------
/** Incidencias pendientes de aprobar (solo las ve la gestión, vía RLS). */
export async function incidenciasPendientesGestion(): Promise<Incident[]> {
  const { data: incRows, error } = await supabase
    .from('incidencias').select('*').eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  if (error) throw error
  const incidencias = (incRows ?? []) as IncidenciaRow[]
  if (incidencias.length === 0) return []
  const dir = await cargarDirectorio()
  return incidencias.map((row) => mapIncidencia(row, dir, [], [], []))
}

/** Aprueba (→abierta) o rechaza (→rechazada) una incidencia pendiente. */
export async function aprobarIncidencia(id: string, aprobar: boolean): Promise<void> {
  const { error } = await supabase.from('incidencias')
    .update({ estado: aprobar ? 'abierta' : 'rechazada' }).eq('id', id)
  if (error) throw error
}
