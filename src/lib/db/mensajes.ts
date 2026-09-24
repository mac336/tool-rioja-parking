// Mensajes (aviso/anuncio/incidencia/sugerencia) — implementación real (Supabase).
// Quien tiene 'publicar_<tipo>' publica ese tipo directo; los vecinos ENVÍAN
// incidencias/anuncios/sugerencias que quedan pendientes de aprobación
// (destino=todos) o como reporte privado a administración (destino=administracion).
// La visibilidad y la edición son POR TIPO (permisos ver_<tipo>/publicar_<tipo>).
// Estado, destino y visibilidad los impone la RLS (migraciones 0031 y 0040).
import { supabase } from '@/lib/supabase'
import type { Mensaje, MensajeTipo, MensajeDestino } from '@/types'
import { cacheBust } from '@/lib/cache'
import { contarComentarios } from './comentarios'

/** Tablón público de la Home: solo publicado, para todos, vigente. A las
 *  SUGERENCIAS les adjunta autor (nombre/piso) y likes (total + si di el mío). */
export async function listMensajes(): Promise<Mensaje[]> {
  const nowISO = new Date().toISOString()
  const { data, error } = await supabase.from('mensajes')
    .select('*').eq('activo', true).eq('estado', 'publicado').eq('destino', 'todos')
    .lte('publica_at', nowISO)
    .order('created_at', { ascending: false })
  if (error) throw error
  const msgs = await conComentarios(await conAdjuntos((data ?? []) as Mensaje[]))

  // Autor: lo necesitan las SUGERENCIAS (siempre lo muestran) y todo mensaje SIN
  // firma — desde la mig. 0062, quien no tiene `elegir_firma` publica sin firma y
  // el post-it enseña a su autor, para que nadie publique de forma anónima ni en
  // nombre de otro. El `directorio` ya expone nombre/vivienda a los activos.
  const sugerencias = msgs.filter((m) => m.tipo === 'sugerencia')
  const necesitanAutor = msgs.filter((m) => m.tipo === 'sugerencia' || !m.firma)
  const autorIds = [...new Set(necesitanAutor.map((m) => m.created_by).filter(Boolean) as string[])]
  const autores = new Map<string, { nombre: string; vivienda: string }>()
  if (autorIds.length > 0) {
    const { data: dir } = await supabase.from('directorio').select('id, nombre, vivienda').in('id', autorIds)
    for (const d of dir ?? []) autores.set(d.id as string, { nombre: d.nombre as string, vivienda: (d.vivienda as string) ?? '' })
  }
  const conAutor = (m: Mensaje): Mensaje => ({
    ...m,
    autor_nombre: m.created_by ? autores.get(m.created_by)?.nombre : undefined,
    autor_vivienda: m.created_by ? autores.get(m.created_by)?.vivienda : undefined,
  })
  if (sugerencias.length === 0) return msgs.map((m) => (m.firma ? m : conAutor(m)))
  // Likes de esas sugerencias.
  const ids = sugerencias.map((m) => m.id)
  const { data: { user } } = await supabase.auth.getUser()
  let miVivienda = ''
  if (user) { const { data: p } = await supabase.from('profiles').select('vivienda').eq('id', user.id).single(); miVivienda = (p?.vivienda as string) ?? '' }
  const { data: likes } = await supabase.from('mensaje_likes').select('mensaje_id, vivienda').in('mensaje_id', ids)
  const total = new Map<string, number>()
  const mio = new Set<string>()
  for (const l of likes ?? []) {
    total.set(l.mensaje_id as string, (total.get(l.mensaje_id as string) ?? 0) + 1)
    if (miVivienda && l.vivienda === miVivienda) mio.add(l.mensaje_id as string)
  }
  return msgs.map((m) => m.tipo !== 'sugerencia' ? (m.firma ? m : conAutor(m)) : {
    ...conAutor(m),
    likes: total.get(m.id) ?? 0,
    yo_like: mio.has(m.id),
  })
}

/** Da o quita el "me gusta" de mi vivienda a una sugerencia. */
export async function alternarLike(mensajeId: string, dar: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: perfil } = await supabase.from('profiles').select('vivienda').eq('id', user.id).single()
  const vivienda = perfil?.vivienda as string | null
  if (!vivienda) throw new Error('Sin vivienda')
  if (dar) {
    const { error } = await supabase.from('mensaje_likes').insert({ mensaje_id: mensajeId, vivienda })
    if (error && error.code !== '23505') throw error // 23505 = ya existe (idempotente)
  } else {
    const { error } = await supabase.from('mensaje_likes').delete().eq('mensaje_id', mensajeId).eq('vivienda', vivienda)
    if (error) throw error
  }
  cacheBust('mensajes')
}

export interface MensajeInput { tipo: MensajeTipo; titulo: string; cuerpo: string; expira_at?: string | null; firma?: string | null; estilo?: string | null; importancia?: string | null; grado?: number | null; color?: string | null; fotos?: Blob[] }

/** Sube las fotos de un mensaje al bucket privado y las registra (máx. 2).
 *  Best-effort: si una falla, el mensaje queda igualmente creado (no lo dejamos
 *  a medias por una foto). Lo usan las DOS vías de alta: publicar directo
 *  (Gestión → Mensajes) y proponer desde Buzón → Publicar. */
async function subirFotos(mensajeId: string, fotos: Blob[] | undefined): Promise<void> {
  for (const [i, foto] of (fotos ?? []).slice(0, 2).entries()) {
    const path = `${mensajeId}/${i}.webp`
    const up = await supabase.storage.from('adjuntos').upload(path, foto, { contentType: foto.type || 'image/webp', upsert: true })
    if (up.error) continue
    await supabase.from('mensaje_adjuntos').insert({ mensaje_id: mensajeId, path, orden: i })
  }
}

/** Gestión publica directamente (estado=publicado, destino=todos). */
export async function crearMensaje(input: MensajeInput): Promise<Mensaje> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('mensajes')
    .insert({
      tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo,
      expira_at: input.expira_at ?? null, firma: input.firma ?? null,
      estilo: input.estilo ?? null, importancia: input.importancia ?? null,
      grado: input.grado ?? null, color: input.color ?? null,
      created_by: user?.id ?? null, estado: 'publicado', destino: 'todos',
    })
    .select('*').single()
  if (error) throw error
  await subirFotos(data.id as string, input.fotos)
  void supabase.functions.invoke('notificar', { body: { kind: 'mensaje', id: data.id } }).catch(() => undefined)
  cacheBust('mensajes', 'avisos')
  return data as Mensaje
}

export interface PublicacionInput {
  tipo: 'incidencia' | 'anuncio' | 'sugerencia'
  titulo: string
  cuerpo: string
  destino: MensajeDestino
  publica_at?: string | null
  expira_at?: string | null
  borrador?: boolean
  fotos?: Blob[] // solo incidencias, máx. 2 (WebP ya comprimidos en el cliente)
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

  await subirFotos(data.id as string, input.fotos)

  if (estado !== 'borrador') {
    void supabase.functions.invoke('notificar', { body: { kind: 'publicacion', id: data.id } }).catch(() => undefined)
  }
  cacheBust('mensajes', 'avisos')
  return data as Mensaje
}

/** Adjunta el nº de comentarios de cada tarjeta, para el contador del post-it
 *  (el hilo en sí se carga al abrir el visor, no aquí). */
async function conComentarios(msgs: Mensaje[]): Promise<Mensaje[]> {
  const ids = msgs.filter((m) => m.tipo !== 'aviso').map((m) => m.id)
  if (ids.length === 0) return msgs
  try {
    const n = await contarComentarios(ids)
    return msgs.map((m) => (n[m.id] ? { ...m, comentarios: n[m.id] } : m))
  } catch { return msgs } // el contador es decorativo: nunca debe tumbar el tablón
}

/** Adjunta a cada mensaje las URLs firmadas de sus fotos (bucket privado, TTL corto). */
async function conAdjuntos(msgs: Mensaje[]): Promise<Mensaje[]> {
  const ids = msgs.map((m) => m.id)
  if (ids.length === 0) return msgs
  const { data: adj } = await supabase.from('mensaje_adjuntos')
    .select('mensaje_id, path, orden').in('mensaje_id', ids).order('orden', { ascending: true })
  if (!adj || adj.length === 0) return msgs
  const paths = adj.map((a) => a.path as string)
  const { data: firmadas } = await supabase.storage.from('adjuntos').createSignedUrls(paths, 300)
  const urlDe = new Map<string, string>()
  for (const f of firmadas ?? []) if (f.signedUrl && f.path) urlDe.set(f.path, f.signedUrl)
  const porMensaje = new Map<string, string[]>()
  for (const a of adj) {
    const u = urlDe.get(a.path as string)
    if (!u) continue
    const arr = porMensaje.get(a.mensaje_id as string) ?? []
    arr.push(u)
    porMensaje.set(a.mensaje_id as string, arr)
  }
  return msgs.map((m) => porMensaje.has(m.id) ? { ...m, adjuntos: porMensaje.get(m.id) } : m)
}

/** Mis publicaciones (las que yo he enviado): borradores, pendientes, etc. */
export async function misPublicaciones(): Promise<Mensaje[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('mensajes')
    .select('*').eq('created_by', user.id).order('created_at', { ascending: false })
  if (error) throw error
  return conAdjuntos((data ?? []) as Mensaje[])
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
    pendientes: await conAdjuntos(await conNombres((pend ?? []) as Mensaje[])),
    reportes: await conAdjuntos(await conNombres((rep ?? []) as Mensaje[])),
  }
}

/** Aprobar o rechazar una publicación pendiente. Aprobar → publicado + push. */
export async function moderarPublicacion(id: string, aprobar: boolean): Promise<void> {
  const patch: Record<string, unknown> = { estado: aprobar ? 'publicado' : 'rechazado', activo: true }
  if (aprobar) patch.publica_at = new Date().toISOString()
  const { error } = await supabase.from('mensajes').update(patch).eq('id', id)
  if (error) throw error
  const kind = aprobar ? 'mensaje' : 'publicacion_rechazada'
  void supabase.functions.invoke('notificar', { body: { kind, id } }).catch(() => undefined)
  cacheBust('mensajes', 'avisos')
}

export async function editarMensaje(id: string, input: MensajeInput): Promise<void> {
  const { error } = await supabase.from('mensajes')
    .update({ tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo, expira_at: input.expira_at ?? null, firma: input.firma ?? null, estilo: input.estilo ?? null, importancia: input.importancia ?? null, grado: input.grado ?? null, color: input.color ?? null }).eq('id', id)
  if (error) throw error
  cacheBust('mensajes', 'avisos')
}

/** «Cerrada»: retira la tarjeta del tablón sin borrarla, poniéndole `expira_at`
 *  AYER. Pensado para las incidencias, que si no no caducan nunca (v1.56.0).
 *  Sigue en Gestión → Mensajes (pestaña Caducados) con sus comentarios. */
export async function cerrarMensaje(id: string): Promise<void> {
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1); ayer.setHours(23, 59, 59, 0)
  const { error } = await supabase.from('mensajes').update({ expira_at: ayer.toISOString() }).eq('id', id)
  if (error) throw error
  cacheBust('mensajes', 'avisos')
}

export async function borrarMensaje(id: string): Promise<void> {
  // Las fotos se borran ANTES y con la Storage API (mig. 0061): es lo único que
  // libera el fichero de verdad — borrar la fila de `storage.objects` por SQL
  // está PROHIBIDO por Supabase y tumbaba el borrado entero. Primero el fichero
  // y luego el mensaje: si algo falla aquí, el mensaje sigue intacto y se puede
  // reintentar; al revés perderíamos las rutas y el fichero quedaría huérfano.
  const { data: adj } = await supabase.from('mensaje_adjuntos').select('path').eq('mensaje_id', id)
  const paths = (adj ?? []).map((a) => a.path as string)
  if (paths.length > 0) {
    const { error: errFotos } = await supabase.storage.from('adjuntos').remove(paths)
    if (errFotos) throw errFotos
  }
  const { error } = await supabase.from('mensajes').delete().eq('id', id)
  if (error) throw error
  cacheBust('mensajes', 'avisos')
}
