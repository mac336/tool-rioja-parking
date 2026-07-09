// Mensajes públicos (aviso/anuncio/incidencia) — implementación real (Supabase).
// Solo la gestión con permiso 'publicar_mensajes' crea/edita/borra (RLS). Al
// crear, se notifica por push a todos los vecinos. Firmas idénticas al mock.
import { supabase } from '@/lib/supabase'
import type { Mensaje, MensajeTipo } from '@/types'

export async function listMensajes(): Promise<Mensaje[]> {
  const { data, error } = await supabase.from('mensajes')
    .select('*').eq('activo', true).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Mensaje[]
}

export interface MensajeInput { tipo: MensajeTipo; titulo: string; cuerpo: string; expira_at?: string | null }

export async function crearMensaje(input: MensajeInput): Promise<Mensaje> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('mensajes')
    .insert({ tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo, expira_at: input.expira_at ?? null, created_by: user?.id ?? null })
    .select('*').single()
  if (error) throw error
  // Aviso push a todos en segundo plano: no bloquea la publicación.
  void supabase.functions.invoke('notificar', { body: { kind: 'mensaje', id: data.id } }).catch(() => undefined)
  return data as Mensaje
}

export async function editarMensaje(id: string, input: MensajeInput): Promise<void> {
  const { error } = await supabase.from('mensajes')
    .update({ tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo, expira_at: input.expira_at ?? null }).eq('id', id)
  if (error) throw error
}

export async function borrarMensaje(id: string): Promise<void> {
  const { error } = await supabase.from('mensajes').delete().eq('id', id)
  if (error) throw error
}
