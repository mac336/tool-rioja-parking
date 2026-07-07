// Encuestas multi-pregunta — implementación real (Supabase).
//
// Modelo BD (ver 0001_schema.sql):
//   encuestas → encuesta_preguntas → encuesta_opciones → encuesta_votos
// No hay columna `estado` (se DERIVA de apertura/cierre) ni recuento por opción
// (se cuentan las filas de encuesta_votos). Los triggers de BD validan que la
// encuesta esté abierta, la opción única y la pertenencia opción↔pregunta; aquí
// solo emitimos las operaciones. La escritura la gatea RLS (gestión).
import { supabase } from '@/lib/supabase'
import type {
  Encuesta, EncuestaEstado, EncuestaFormato, EncuestaOpcion, EncuestaPregunta, EncuestaTipo,
} from '@/types'

// ---- Filas crudas del select anidado ----------------------------------------
interface VotoRow { id: string; vivienda: string; opcion_id: string }
interface OpcionRow { id: string; texto: string; orden: number; encuesta_votos: VotoRow[] | null }
interface PreguntaRow { id: string; texto: string; tipo: EncuestaTipo; orden: number; encuesta_opciones: OpcionRow[] | null }
interface EncuestaRow {
  id: string; titulo: string; descripcion: string | null; formato: EncuestaFormato
  apertura: string; cierre: string; creada_por: string; created_at: string
  encuesta_preguntas: PreguntaRow[] | null
}

const SELECT = `
  id, titulo, descripcion, formato, apertura, cierre, creada_por, created_at,
  encuesta_preguntas (
    id, texto, tipo, orden,
    encuesta_opciones (
      id, texto, orden,
      encuesta_votos ( id, vivienda, opcion_id )
    )
  )
`

// ---- Helpers -----------------------------------------------------------------
/** Estado derivado: programada (aún no abre) / cerrada (ya cerró) / abierta. */
function derivarEstado(apertura: string, cierre: string): EncuestaEstado {
  const ahora = Date.now()
  if (ahora < new Date(apertura).getTime()) return 'programada'
  if (ahora > new Date(cierre).getTime()) return 'cerrada'
  return 'abierta'
}

/** Vivienda del usuario actual (o null si no autenticado / sin vivienda). */
async function miViviendaOpt(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('vivienda').eq('id', user.id).single()
  return data?.vivienda ?? null
}

/** Usuario + vivienda obligatorios para escribir un voto. */
async function usuarioYVivienda(): Promise<{ userId: string; vivienda: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('profiles').select('vivienda').eq('id', user.id).single()
  if (error) throw error
  const vivienda = data?.vivienda
  if (!vivienda) throw new Error('El usuario no tiene vivienda asignada')
  return { userId: user.id, vivienda }
}

/** Total de viviendas del catálogo (denominador del "X de Y"). */
async function contarViviendas(): Promise<number> {
  const { count, error } = await supabase.from('viviendas').select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/** Nombre de los creadores vía la vista `directorio` (fallback 'Gestión'). */
async function nombresCreadores(ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)]
  if (unicos.length === 0) return new Map()
  const { data } = await supabase.from('directorio').select('id, nombre').in('id', unicos)
  return new Map((data ?? []).map((d: { id: string; nombre: string }) => [d.id, d.nombre]))
}

/** Ensambla una Encuesta de dominio a partir de la fila cruda anidada. */
function ensamblar(
  row: EncuestaRow, miVivienda: string | null, totalViviendas: number, nombres: Map<string, string>,
): Encuesta {
  const viviendasVotantes = new Set<string>()
  const preguntas: EncuestaPregunta[] = [...(row.encuesta_preguntas ?? [])]
    .sort((a, b) => a.orden - b.orden)
    .map((p) => {
      const miVoto: string[] = []
      const opciones: EncuestaOpcion[] = [...(p.encuesta_opciones ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .map((o) => {
          const votos = o.encuesta_votos ?? []
          for (const v of votos) {
            viviendasVotantes.add(v.vivienda)
            if (miVivienda && v.vivienda === miVivienda) miVoto.push(o.id)
          }
          return { id: o.id, texto: o.texto, votos: votos.length }
        })
      return { id: p.id, texto: p.texto, tipo: p.tipo, opciones, mi_voto_opcion_ids: miVoto }
    })
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion ?? undefined,
    formato: row.formato,
    apertura: row.apertura,
    cierre: row.cierre,
    estado: derivarEstado(row.apertura, row.cierre),
    creada_por_nombre: nombres.get(row.creada_por) ?? 'Gestión',
    total_viviendas: totalViviendas,
    viviendas_votantes: viviendasVotantes.size,
    preguntas,
  }
}

// ---- API ---------------------------------------------------------------------
export async function listEncuestas(): Promise<Encuesta[]> {
  const [{ data, error }, miVivienda, totalViviendas] = await Promise.all([
    supabase.from('encuestas').select(SELECT).order('created_at', { ascending: false }),
    miViviendaOpt(),
    contarViviendas(),
  ])
  if (error) throw error
  const rows = (data ?? []) as unknown as EncuestaRow[]
  const nombres = await nombresCreadores(rows.map((r) => r.creada_por))
  return rows.map((r) => ensamblar(r, miVivienda, totalViviendas, nombres))
}

export async function getEncuesta(id: string): Promise<Encuesta | null> {
  const [{ data, error }, miVivienda, totalViviendas] = await Promise.all([
    supabase.from('encuestas').select(SELECT).eq('id', id).maybeSingle(),
    miViviendaOpt(),
    contarViviendas(),
  ])
  if (error) throw error
  if (!data) return null
  const row = data as unknown as EncuestaRow
  const nombres = await nombresCreadores([row.creada_por])
  return ensamblar(row, miVivienda, totalViviendas, nombres)
}

export async function votarPregunta(encuestaId: string, preguntaId: string, opcionIds: string[]): Promise<Encuesta> {
  const { userId, vivienda } = await usuarioYVivienda()
  // Reemplazo atómico por vivienda+pregunta: borra el voto previo e inserta el nuevo.
  const { error: delErr } = await supabase.from('encuesta_votos')
    .delete().eq('pregunta_id', preguntaId).eq('vivienda', vivienda)
  if (delErr) throw delErr
  if (opcionIds.length > 0) {
    const filas = opcionIds.map((opcion_id) => ({
      pregunta_id: preguntaId, vivienda, opcion_id, emitido_por: userId,
    }))
    const { error: insErr } = await supabase.from('encuesta_votos').insert(filas)
    if (insErr) throw insErr
  }
  const encuesta = await getEncuesta(encuestaId)
  if (!encuesta) throw new Error('Encuesta no encontrada')
  return encuesta
}

export async function crearEncuesta(input: {
  titulo: string; descripcion?: string; cierre: string; formato: EncuestaFormato
  preguntas: { texto: string; tipo: EncuestaTipo; opciones: string[] }[]
}): Promise<Encuesta> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  // apertura la pone la BD por defecto (now()).
  const { data: enc, error } = await supabase.from('encuestas').insert({
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    cierre: input.cierre,
    formato: input.formato,
    creada_por: user.id,
  }).select('id').single()
  if (error) throw error

  for (let i = 0; i < input.preguntas.length; i++) {
    const p = input.preguntas[i]
    const { data: preg, error: pErr } = await supabase.from('encuesta_preguntas').insert({
      encuesta_id: enc.id, texto: p.texto, tipo: p.tipo, orden: i,
    }).select('id').single()
    if (pErr) throw pErr
    if (p.opciones.length > 0) {
      const opciones = p.opciones.map((texto, j) => ({ pregunta_id: preg.id, texto, orden: j }))
      const { error: oErr } = await supabase.from('encuesta_opciones').insert(opciones)
      if (oErr) throw oErr
    }
  }

  const encuesta = await getEncuesta(enc.id)
  if (!encuesta) throw new Error('Encuesta no encontrada tras crearla')
  return encuesta
}

export async function cerrarEncuesta(id: string): Promise<void> {
  const { error } = await supabase.from('encuestas')
    .update({ cierre: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function borrarEncuesta(id: string): Promise<void> {
  // Cascada de BD: elimina preguntas, opciones y votos.
  const { error } = await supabase.from('encuestas').delete().eq('id', id)
  if (error) throw error
}
