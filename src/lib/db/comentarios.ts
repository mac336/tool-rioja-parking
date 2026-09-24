// Comentarios de las tarjetas del tablón (mig. 0063) — implementación real.
// Se comentan incidencias, anuncios y sugerencias; los AVISOS no (son
// comunicados de la administración, ver specs/16). Publicación directa: la RLS
// decide quién puede escribir y quién puede borrar, la interfaz solo acompaña.
import { supabase, usuarioActual } from '@/lib/supabase'
import type { Comentario } from '@/types'
import { cacheBust } from '@/lib/cache'

/** Comentarios de una tarjeta, con su autor (nombre · piso) y si lo he reportado. */
export async function listComentarios(mensajeId: string): Promise<Comentario[]> {
  const { data, error } = await supabase.from('mensaje_comentarios')
    .select('*').eq('mensaje_id', mensajeId).order('created_at', { ascending: true })
  if (error) throw error
  const filas = (data ?? []) as Comentario[]
  if (filas.length === 0) return filas

  // Autor desde el directorio (mismo criterio que las sugerencias).
  const ids = [...new Set(filas.map((c) => c.created_by).filter(Boolean))]
  const autores = new Map<string, { nombre: string; vivienda: string }>()
  if (ids.length > 0) {
    const { data: dir } = await supabase.from('directorio').select('id, nombre, vivienda').in('id', ids)
    for (const d of dir ?? []) autores.set(d.id as string, { nombre: d.nombre as string, vivienda: (d.vivienda as string) ?? '' })
  }
  // Reportes: los míos (para no reportar dos veces) y el total si soy gestión.
  const user = await usuarioActual()
  const { data: reps } = await supabase.from('comentario_reportes')
    .select('comentario_id, reportado_por').in('comentario_id', filas.map((c) => c.id))
  const total = new Map<string, number>()
  const mios = new Set<string>()
  for (const r of reps ?? []) {
    total.set(r.comentario_id as string, (total.get(r.comentario_id as string) ?? 0) + 1)
    if (user && r.reportado_por === user.id) mios.add(r.comentario_id as string)
  }
  return filas.map((c) => ({
    ...c,
    autor_nombre: autores.get(c.created_by)?.nombre,
    autor_vivienda: autores.get(c.created_by)?.vivienda,
    reportes: total.get(c.id) ?? 0,
    yo_reporte: mios.has(c.id),
  }))
}

/** Nº de comentarios por tarjeta, para el contador del post-it. */
export async function contarComentarios(mensajeIds: string[]): Promise<Record<string, number>> {
  if (mensajeIds.length === 0) return {}
  const { data } = await supabase.from('mensaje_comentarios').select('mensaje_id').in('mensaje_id', mensajeIds)
  const out: Record<string, number> = {}
  for (const c of data ?? []) out[c.mensaje_id as string] = (out[c.mensaje_id as string] ?? 0) + 1
  return out
}

export async function crearComentario(mensajeId: string, cuerpo: string): Promise<void> {
  const { error } = await supabase.from('mensaje_comentarios')
    .insert({ mensaje_id: mensajeId, cuerpo: cuerpo.trim() })
  if (error) throw error
  cacheBust('mensajes')
  // Aviso al autor de la tarjeta (best-effort, como el resto de notificaciones).
  void supabase.functions.invoke('notificar', { body: { kind: 'comentario', id: mensajeId } }).catch(() => undefined)
}

export async function borrarComentario(id: string): Promise<void> {
  const { error } = await supabase.from('mensaje_comentarios').delete().eq('id', id)
  if (error) throw error
  cacheBust('mensajes')
}

/** Reportar un comentario (1 por persona). Solo marca; no oculta nada. */
export async function reportarComentario(comentarioId: string): Promise<void> {
  const { error } = await supabase.from('comentario_reportes').insert({ comentario_id: comentarioId })
  if (error && error.code !== '23505') throw error // 23505 = ya lo había reportado
}
