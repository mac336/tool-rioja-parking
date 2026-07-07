// Anuncios — implementación real (Supabase). Tablón + moderación + reportes +
// bloqueo de viviendas. La seguridad la gatea RLS (0003) y los triggers (0002):
// en crear, autor_id / vivienda / estado='pendiente' los rellena la BD.
//
// Nombres de autor: NO se hace join a `profiles` (RLS lo bloquea entre viviendas).
// Se lee la vista `directorio` (id → nombre) a un Map y se resuelve desde ahí; si
// no se resuelve, autor_nombre = '' (no rompe).
import { supabase } from '@/lib/supabase'
import type { Anuncio, AnuncioNivel } from '@/types'

// ---- Sesión ------------------------------------------------------------------
async function usuarioActual(): Promise<{ id: string; vivienda: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('profiles')
    .select('vivienda').eq('id', user.id).single()
  if (error) throw error
  return { id: user.id, vivienda: (data?.vivienda as string | null) ?? null }
}

// ---- Directorio (resolución de nombres sin join a profiles) ------------------
async function cargarDirectorio(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('directorio').select('id, nombre')
  if (error) throw error
  const map = new Map<string, string>()
  for (const row of (data ?? []) as { id: string; nombre: string }[]) map.set(row.id, row.nombre)
  return map
}

// ---- Filas de BD -------------------------------------------------------------
interface AnuncioRow {
  id: string; autor_id: string; vivienda: string
  titulo: string; cuerpo: string; imagen_path: string | null
  fecha_inicio: string; fecha_fin: string; revision_larga: boolean
  nivel_solicitado: AnuncioNivel; nivel: AnuncioNivel | null
  estado: Anuncio['estado']; aprobado_por: string | null
  motivo_rechazo: string | null; publicado_at: string | null; created_at: string
}

function mapAnuncio(row: AnuncioRow, dir: Map<string, string>): Anuncio {
  return {
    id: row.id,
    autor_id: row.autor_id,
    autor_nombre: dir.get(row.autor_id) ?? '',
    vivienda: row.vivienda,
    titulo: row.titulo,
    cuerpo: row.cuerpo,
    imagen_path: row.imagen_path ?? undefined,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    revision_larga: row.revision_larga,
    nivel_solicitado: row.nivel_solicitado,
    nivel: row.nivel,
    estado: row.estado,
    aprobado_por: row.aprobado_por ?? undefined,
    motivo_rechazo: row.motivo_rechazo ?? undefined,
    publicado_at: row.publicado_at ?? undefined,
    created_at: row.created_at,
  }
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

// ---- Listados (vecino) -------------------------------------------------------
export async function anunciosPrincipales(): Promise<Anuncio[]> {
  const hoy = hoyISO()
  const [dir, res] = await Promise.all([
    cargarDirectorio(),
    supabase.from('anuncios').select('*')
      .eq('estado', 'publicado').eq('nivel', 'principal')
      .lte('fecha_inicio', hoy).gte('fecha_fin', hoy)
      .order('publicado_at', { ascending: false }),
  ])
  if (res.error) throw res.error
  return ((res.data ?? []) as AnuncioRow[]).map((r) => mapAnuncio(r, dir))
}

export async function anunciosListado(): Promise<Anuncio[]> {
  const hoy = hoyISO()
  const [dir, res] = await Promise.all([
    cargarDirectorio(),
    supabase.from('anuncios').select('*')
      .eq('estado', 'publicado')
      .lte('fecha_inicio', hoy).gte('fecha_fin', hoy)
      .order('publicado_at', { ascending: false }),
  ])
  if (res.error) throw res.error
  return ((res.data ?? []) as AnuncioRow[]).map((r) => mapAnuncio(r, dir))
}

export async function misAnuncios(): Promise<Anuncio[]> {
  const user = await usuarioActual()
  const [dir, res] = await Promise.all([
    cargarDirectorio(),
    supabase.from('anuncios').select('*')
      .eq('autor_id', user.id)
      .order('created_at', { ascending: false }),
  ])
  if (res.error) throw res.error
  return ((res.data ?? []) as AnuncioRow[]).map((r) => mapAnuncio(r, dir))
}

export async function viviendaPuedePublicar(): Promise<boolean> {
  const user = await usuarioActual()
  if (!user.vivienda) return false
  const { data, error } = await supabase.from('viviendas')
    .select('puede_publicar_anuncios').eq('codigo', user.vivienda).maybeSingle()
  if (error) throw error
  return (data?.puede_publicar_anuncios as boolean | undefined) ?? false
}

// ---- Crear / editar / borrar (vecino) ----------------------------------------
export async function crearAnuncio(input: {
  titulo: string; cuerpo: string; fechaInicio: string; fechaFin: string; nivelSolicitado: AnuncioNivel
}): Promise<Anuncio> {
  // autor_id / vivienda / estado='pendiente' / nivel los pone la BD (trigger/default).
  // Si la vivienda está bloqueada, RLS/constraint rechaza → se propaga el error.
  const { data, error } = await supabase.from('anuncios').insert({
    titulo: input.titulo,
    cuerpo: input.cuerpo,
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    nivel_solicitado: input.nivelSolicitado,
  }).select('*').single()
  if (error) throw error
  const dir = await cargarDirectorio()
  return mapAnuncio(data as AnuncioRow, dir)
}

export async function editarAnuncio(id: string, input: {
  titulo: string; cuerpo: string; fechaInicio: string; fechaFin: string; nivelSolicitado: AnuncioNivel
}): Promise<Anuncio> {
  const { data, error } = await supabase.from('anuncios').update({
    titulo: input.titulo,
    cuerpo: input.cuerpo,
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    nivel_solicitado: input.nivelSolicitado,
  }).eq('id', id).select('*').single()
  if (error) throw error
  const dir = await cargarDirectorio()
  return mapAnuncio(data as AnuncioRow, dir)
}

export async function borrarAnuncio(id: string): Promise<void> {
  const { error } = await supabase.from('anuncios').delete().eq('id', id)
  if (error) throw error
}

// ---- Moderación (gestión) ----------------------------------------------------
export async function anunciosPendientesGestion(): Promise<Anuncio[]> {
  const [dir, res] = await Promise.all([
    cargarDirectorio(),
    supabase.from('anuncios').select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false }),
  ])
  if (res.error) throw res.error
  return ((res.data ?? []) as AnuncioRow[]).map((r) => mapAnuncio(r, dir))
}

export async function resolverAnuncio(
  id: string, accion: 'publicar' | 'rechazar', nivel?: AnuncioNivel, motivo?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  if (accion === 'publicar') {
    // Si no se pasa nivel, se usa el nivel_solicitado del propio anuncio.
    let nivelFinal = nivel
    if (!nivelFinal) {
      const { data, error } = await supabase.from('anuncios')
        .select('nivel_solicitado').eq('id', id).single()
      if (error) throw error
      nivelFinal = data.nivel_solicitado as AnuncioNivel
    }
    const { error } = await supabase.from('anuncios').update({
      estado: 'publicado',
      nivel: nivelFinal,
      publicado_at: new Date().toISOString(),
      aprobado_por: user.id,
    }).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('anuncios').update({
      estado: 'rechazado',
      motivo_rechazo: motivo ?? null,
      aprobado_por: user.id,
    }).eq('id', id)
    if (error) throw error
  }
}

/** Mover un anuncio publicado entre principal/secundario (gestión). */
export async function moverNivelAnuncio(id: string, nivel: AnuncioNivel): Promise<void> {
  const { error } = await supabase.from('anuncios')
    .update({ nivel }).eq('id', id).eq('estado', 'publicado')
  if (error) throw error
}

/** Despublicar/archivar un anuncio publicado (gestión). */
export async function despublicarAnuncio(id: string): Promise<void> {
  const { error } = await supabase.from('anuncios')
    .update({ estado: 'archivado' }).eq('id', id)
  if (error) throw error
}

// ---- Reportes de contenido ---------------------------------------------------
export async function reportarAnuncio(anuncioId: string, motivo: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('reportes').insert({
    entidad: 'anuncio',
    entidad_id: anuncioId,
    autor_id: user.id,
    motivo,
  })
  if (error) throw error
}

export interface ReporteListado {
  id: string; entidad_id: string; entidad_titulo: string
  autor: string; motivo: string; created_at: string
}

export async function listReportes(): Promise<ReporteListado[]> {
  const { data, error } = await supabase.from('reportes').select('*')
    .eq('entidad', 'anuncio').eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  if (error) throw error
  const reportes = (data ?? []) as {
    id: string; entidad_id: string; autor_id: string; motivo: string; created_at: string
  }[]
  if (reportes.length === 0) return []

  const entidadIds = [...new Set(reportes.map((r) => r.entidad_id))]
  const [dir, anunRes] = await Promise.all([
    cargarDirectorio(),
    supabase.from('anuncios').select('id, titulo').in('id', entidadIds),
  ])
  if (anunRes.error) throw anunRes.error
  const titulos = new Map<string, string>()
  for (const a of (anunRes.data ?? []) as { id: string; titulo: string }[]) titulos.set(a.id, a.titulo)

  return reportes.map((r) => ({
    id: r.id,
    entidad_id: r.entidad_id,
    entidad_titulo: titulos.get(r.entidad_id) ?? '—',
    autor: dir.get(r.autor_id) ?? r.autor_id,
    motivo: r.motivo,
    created_at: r.created_at,
  }))
}

export async function descartarReporte(id: string): Promise<void> {
  const { error } = await supabase.from('reportes')
    .update({ estado: 'descartado' }).eq('id', id)
  if (error) throw error
}

// ---- Bloqueo de viviendas para publicar (gestión) ----------------------------
export async function listViviendasBloqueadas(): Promise<string[]> {
  const { data, error } = await supabase.from('viviendas')
    .select('codigo').eq('puede_publicar_anuncios', false).order('orden')
  if (error) throw error
  return ((data ?? []) as { codigo: string }[]).map((v) => v.codigo)
}

export async function bloquearVivienda(vivienda: string, bloquear: boolean): Promise<void> {
  const { error } = await supabase.from('viviendas')
    .update({ puede_publicar_anuncios: !bloquear }).eq('codigo', vivienda)
  if (error) throw error
}
