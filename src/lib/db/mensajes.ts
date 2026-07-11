// Mensajes (aviso/anuncio/incidencia) — implementación real (Supabase).
// La gestión con 'publicar_mensajes' publica directo; los vecinos ENVÍAN
// incidencias/anuncios que quedan pendientes de aprobación (destino=todos) o
// como reporte privado a administración (destino=administracion). Estado y
// destino los impone la RLS (migración 0031).
import { supabase } from '@/lib/supabase'
import type { Mensaje, MensajeTipo, MensajeDestino } from '@/types'

/** Tablón público de la Home: solo publicado, para todos, vigente. */
export async function listMensajes(): Promise<Mensaje[]> {
  const nowISO = new Date().toISOString()
  const { data, error } = await supabase.from('mensajes')
    .select('*').eq('activo', true).eq('estado', 'publicado').eq('destino', 'todos')
    .lte('publica_at', nowISO)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Mensaje[]
}

export interface MensajeInput { tipo: MensajeTipo; titulo: string; cuerpo: string; expira_at?: string | null; firma?: string | null }

/** Gestión publica directamente (estado=publicado, destino=todos). */
export async function crearMensaje(input: MensajeInput): Promise<Mensaje> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('mensajes')
    .insert({
      tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo,
      expira_at: input.expira_at ?? null, firma: input.firma ?? null,
      created_by: user?.id ?? null, estado: 'publicado', destino: 'todos',
    })
    .select('*').single()
  if (error) throw error
  void supabase.functions.invoke('notificar', { body: { kind: 'mensaje', id: data.id } }).catch(() => undefined)
  return data as Mensaje
}

export interface PublicacionInput {
  tipo: 'incidencia' | 'anuncio'
  titulo: string
  cuerpo: string
  destino: MensajeDestino
  publica_at?: string | null
  expira_at?: string | null
  borrador?: boolean
}

/** Un VECINO envía una incidencia/anuncio. destino=todos → pendiente de aprobar
 *  (o borrador); destino=administracion → reporte privado (publicado para la
 *  gestión). */
export async function crearPublicacion(input: PublicacionInput): Promise<Mensaje> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const estado = input.destino === 'administracion' ? 'publicado' : (input.borrador ? 'borrador' : 'pendiente')
  const { data, error } = await supabase.from('mensajes')
    .insert({
      tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo,
      destino: input.destino, estado,
      publica_at: input.publica_at ?? new Date().toISOString(),
      expira_at: input.expira_at ?? null,
      created_by: user.id,
    })
    .select('*').single()
  if (error) throw error
  if (estado !== 'borrador') {
    void supabase.functions.invoke('notificar', { body: { kind: 'publicacion', id: data.id } }).catch(() => undefined)
  }
  return data as Mensaje
}

/** Mis publicaciones (las que yo he enviado): borradores, pendientes, etc. */
export async function misPublicaciones(): Promise<Mensaje[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('mensajes')
    .select('*').eq('created_by', user.id).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Mensaje[]
}

export interface ColaPublicaciones { pendientes: Mensaje[]; reportes: Mensaje[] }

async function conNombres(msgs: Mensaje[]): Promise<Mensaje[]> {
  const ids = [...new Set(msgs.map((m) => m.created_by).filter(Boolean) as string[])]
  if (ids.length === 0) return msgs
  const { data: dir } = await supabase.from('directorio').select('id, nombre, vivienda').in('id', ids)
  const map = new Map<string, { nombre: string; vivienda: string }>()
  for (const d of dir ?? []) map.set(d.id as string, { nombre: d.nombre as string, vivienda: (d.vivienda as string) ?? '' })
  return msgs.map((m) => ({ ...m, autor_nombre: m.created_by ? map.get(m.created_by)?.nombre : undefined, autor_vivienda: m.created_by ? map.get(m.created_by)?.vivienda : undefined }))
}

/** Cola de moderación (gestión): pendientes de aprobar + reportes a administración. */
export async function publicacionesGestion(): Promise<ColaPublicaciones> {
  const { data: pend } = await supabase.from('mensajes')
    .select('*').eq('estado', 'pendiente').order('created_at', { ascending: true })
  const { data: rep } = await supabase.from('mensajes')
    .select('*').eq('destino', 'administracion').order('created_at', { ascending: false })
  return {
    pendientes: await conNombres((pend ?? []) as Mensaje[]),
    reportes: await conNombres((rep ?? []) as Mensaje[]),
  }
}

/** Aprobar o rechazar una publicación pendiente. Aprobar → publicado + push. */
export async function moderarPublicacion(id: string, aprobar: boolean): Promise<void> {
  const patch: Record<string, unknown> = { estado: aprobar ? 'publicado' : 'rechazado', activo: true }
  if (aprobar) patch.publica_at = new Date().toISOString()
  const { error } = await supabase.from('mensajes').update(patch).eq('id', id)
  if (error) throw error
  if (aprobar) void supabase.functions.invoke('notificar', { body: { kind: 'mensaje', id } }).catch(() => undefined)
}

export async function editarMensaje(id: string, input: MensajeInput): Promise<void> {
  const { error } = await supabase.from('mensajes')
    .update({ tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo, expira_at: input.expira_at ?? null, firma: input.firma ?? null }).eq('id', id)
  if (error) throw error
}

export async function borrarMensaje(id: string): Promise<void> {
  const { error } = await supabase.from('mensajes').delete().eq('id', id)
  if (error) throw error
}
