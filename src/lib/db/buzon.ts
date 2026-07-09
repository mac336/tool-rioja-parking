// Buzón privado vecino↔administración — implementación real (Supabase).
// RLS: el vecino ve solo sus hilos; la gestión ve todos. de_gestion lo fija un
// trigger (no de confianza en cliente). Firmas idénticas al mock.
import { supabase } from '@/lib/supabase'
import type { Hilo, HiloMensaje, MensajeTipo } from '@/types'
import { crearMensaje } from '@/lib/db/mensajes'

async function nombresPorId(ids: string[]): Promise<Map<string, { nombre: string; vivienda: string }>> {
  const m = new Map<string, { nombre: string; vivienda: string }>()
  if (ids.length === 0) return m
  const { data } = await supabase.from('directorio').select('id, nombre, vivienda').in('id', ids)
  for (const d of data ?? []) m.set(d.id as string, { nombre: d.nombre as string, vivienda: (d.vivienda as string) ?? '' })
  return m
}

/** Hilos del vecino actual (los suyos). */
export async function misHilos(): Promise<Hilo[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('hilos')
    .select('*').eq('vecino_id', user.id).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Hilo[]
}

/** Todos los hilos (gestión), con nombre/vivienda del vecino. */
export async function hilosGestion(): Promise<Hilo[]> {
  const { data, error } = await supabase.from('hilos')
    .select('*').order('updated_at', { ascending: false })
  if (error) throw error
  const hilos = (data ?? []) as Hilo[]
  const nombres = await nombresPorId([...new Set(hilos.map((h) => h.vecino_id))])
  return hilos.map((h) => ({ ...h, vecino_nombre: nombres.get(h.vecino_id)?.nombre, vecino_vivienda: nombres.get(h.vecino_id)?.vivienda }))
}

/** Un hilo con sus mensajes (marcándolo como leído para quien lo abre). */
export async function getHilo(id: string): Promise<{ hilo: Hilo; mensajes: HiloMensaje[] } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: hilo, error } = await supabase.from('hilos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!hilo) return null
  const { data: msgs, error: e2 } = await supabase.from('hilo_mensajes')
    .select('*').eq('hilo_id', id).order('created_at', { ascending: true })
  if (e2) throw e2
  const nombres = await nombresPorId([...new Set((msgs ?? []).map((m) => m.autor_id as string))])
  const mensajes = (msgs ?? []).map((m) => ({ ...m, autor_nombre: nombres.get(m.autor_id as string)?.nombre })) as HiloMensaje[]
  // Marcar leído para quien abre (vecino dueño o gestión).
  const soyDueño = hilo.vecino_id === user.id
  try { await supabase.from('hilos').update(soyDueño ? { no_leido_vecino: false } : { no_leido_gestion: false }).eq('id', id) } catch { /* noop */ }
  return { hilo: hilo as Hilo, mensajes }
}

/** El vecino abre un hilo nuevo con su primer mensaje. */
export async function crearHilo(input: { asunto: string; texto: string }): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: hilo, error } = await supabase.from('hilos')
    .insert({ vecino_id: user.id, asunto: input.asunto }).select('id').single()
  if (error) throw error
  const { error: e2 } = await supabase.from('hilo_mensajes').insert({ hilo_id: hilo.id, autor_id: user.id, texto: input.texto })
  if (e2) throw e2
  void supabase.functions.invoke('notificar', { body: { kind: 'buzon', id: hilo.id } }).catch(() => undefined)
  return hilo.id as string
}

/** Añade un mensaje a un hilo (vecino o gestión). */
export async function responderHilo(hiloId: string, texto: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('hilo_mensajes').insert({ hilo_id: hiloId, autor_id: user.id, texto })
  if (error) throw error
  void supabase.functions.invoke('notificar', { body: { kind: 'buzon', id: hiloId } }).catch(() => undefined)
}

export async function cerrarHilo(hiloId: string, cerrar = true): Promise<void> {
  const { error } = await supabase.from('hilos').update({ estado: cerrar ? 'cerrado' : 'abierto' }).eq('id', hiloId)
  if (error) throw error
}

/** La gestión convierte un reporte del buzón en un mensaje público. */
export async function convertirEnMensaje(hiloId: string, input: { tipo: MensajeTipo; titulo: string; cuerpo: string }): Promise<void> {
  await crearMensaje(input)
  // Marca el hilo como atendido (opcional): lo dejamos abierto para poder seguir hablando.
  void hiloId
}
