// Admin (solicitudes de acceso, gestión de vecinos, avisos) — implementación
// real (Supabase). Firmas idénticas al mock (src/lib/apiMock.ts). RLS decide
// qué ve gestión; las operaciones sensibles (alta, suspensión, cambio de rol)
// pasan por Edge Functions con service_role, no por escritura directa.
import { supabase } from '@/lib/supabase'
import type { AccessRequest, Profile, Role } from '@/types'
import { iniciales, fechaCorta } from '@/lib/format'
import { cacheBust } from '@/lib/cache'

// ---- Solicitudes de acceso ---------------------------------------------------
export async function listAccessRequests(): Promise<AccessRequest[]> {
  const { data, error } = await supabase.from('access_requests')
    .select('*')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as AccessRequest[]
}

export async function resolverSolicitud(id: string, aprobar: boolean, vivienda?: string, rol?: Role): Promise<void> {
  if (aprobar) {
    // Vivienda/rol elegidos en el panel; si no vienen, se usa la vivienda de la
    // solicitud y rol 'vecino'. El alta la ejecuta la Edge Function con
    // service_role (crea/invita usuario + fija profile activo).
    let viv = vivienda
    if (!viv) {
      const { data: solicitud, error: readErr } = await supabase.from('access_requests')
        .select('vivienda').eq('id', id).single()
      if (readErr) throw readErr
      viv = solicitud.vivienda
    }
    const { error } = await supabase.functions.invoke('aprobar-solicitud', {
      body: { requestId: id, vivienda: viv, rol: rol ?? 'vecino' },
    })
    if (error) throw error
    cacheBust('solicitudes', 'avisos')
    return
  }
  const { error } = await supabase.from('access_requests')
    .update({ estado: 'rechazada' }).eq('id', id)
  if (error) throw error
  cacheBust('solicitudes', 'avisos')
}

// Alta pública: pasa por la Edge Function (captcha + rate-limit + service_role).
export async function crearSolicitud(input: { nombre: string; email: string; vivienda: string; comentario?: string; esInquilino?: boolean }): Promise<void> {
  const { error } = await supabase.functions.invoke('solicitar-acceso', { body: input })
  if (error) throw error
  cacheBust('solicitudes', 'avisos')
}

// ---- Vecinos (gestión de usuarios) -------------------------------------------
export async function listVecinos(): Promise<Profile[]> {
  // La RLS deja a gestión ver todos los perfiles.
  const { data, error } = await supabase.from('profiles').select('*').order('nombre')
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, iniciales: iniciales(p.nombre) })) as Profile[]
}

export async function suspenderVecino(id: string, suspender: boolean): Promise<void> {
  // El cliente NO puede cambiar estado directamente (seguridad) → Edge Function.
  const { error } = await supabase.functions.invoke('gestionar-usuario', {
    body: { accion: suspender ? 'suspender' : 'reactivar', userId: id },
  })
  if (error) throw error
}

export async function cambiarRolVecino(id: string, rol: Role): Promise<void> {
  const { error } = await supabase.functions.invoke('gestionar-usuario', {
    body: { accion: 'rol', userId: id, rol },
  })
  if (error) throw error
}

export async function editarVecino(id: string, patch: { nombre?: string; vivienda?: string }): Promise<void> {
  const { error } = await supabase.functions.invoke('gestionar-usuario', {
    body: { accion: 'editar', userId: id, ...patch },
  })
  if (error) throw error
}

export async function darDeBajaVecino(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('gestionar-usuario', {
    body: { accion: 'baja', userId: id },
  })
  if (error) throw error
}

/** Borrado DEFINITIVO e IRREVERSIBLE (solo cuentas suspendidas o de baja). Borra
 *  el usuario de Auth; profiles cascada. Falla con mensaje claro si el vecino
 *  tiene actividad registrada en tablas sin cascada (reservas, votos, buzón…). */
export async function eliminarVecinoDefinitivo(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('gestionar-usuario', {
    body: { accion: 'eliminar', userId: id },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
}

/** Alta DIRECTA por el admin (sin registro): crea Auth + perfil activo.
 *  El vecino/tester entra después con su código OTP. */
export async function crearVecinoDirecto(input: { nombre: string; email: string; vivienda: string; rol: Role }): Promise<void> {
  const { data, error } = await supabase.functions.invoke('gestionar-usuario', {
    body: { accion: 'crear', ...input },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
}

/** Cuántas cuentas activas hay y cuántas han iniciado sesión alguna vez.
 *  (Función `stats_acceso`, solo gestión; migración 0024.) */
export async function statsAcceso(): Promise<{ creados: number; entrados: number; instalados: number }> {
  const { data, error } = await supabase.rpc('stats_acceso')
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as { creados?: number; entrados?: number; instalados?: number } | null
  return { creados: row?.creados ?? 0, entrados: row?.entrados ?? 0, instalados: row?.instalados ?? 0 }
}

/** Marca la cuenta actual como "app instalada" (la llama la app si corre en
 *  modo standalone). Best-effort; no bloquea nada si falla. */
export async function registrarPwa(): Promise<void> {
  await supabase.rpc('registrar_pwa')
}

/** Por vivienda con cuenta activa: nº de cuentas y cuántas han entrado alguna
 *  vez. (Función `stats_acceso_por_vivienda`, solo gestión; migración 0025.)
 *  Excluye cuentas de inquilino (no cuentan para la adopción). */
export async function statsAccesoPorVivienda(): Promise<{ vivienda: string; cuentas: number; entrados: number }[]> {
  const { data, error } = await supabase.rpc('stats_acceso_por_vivienda')
  if (error) throw error
  return (data ?? []).map((r: { vivienda: string; cuentas: number; entrados: number }) => ({
    vivienda: r.vivienda, cuentas: r.cuentas, entrados: r.entrados,
  }))
}

/** Nº de solicitudes de acceso PENDIENTES. La RLS de access_requests solo deja
 *  verlas a quien puede aprobar altas → devuelve 0 para el resto. Para el badge
 *  de la pestaña "Gestión". */
export async function contarSolicitudesPendientes(): Promise<number> {
  const { count, error } = await supabase.from('access_requests')
    .select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
  if (error) return 0
  return count ?? 0
}

/** Viviendas con al menos una cuenta de INQUILINO activa: el dashboard de
 *  adopción las excluye (no son objetivo de adopción). Solo gestión; mig. 0049. */
export async function viviendasInquilino(): Promise<string[]> {
  const { data, error } = await supabase.rpc('viviendas_inquilino')
  if (error) throw error
  return (data ?? []).map((r: { vivienda: string }) => r.vivienda)
}

// ---- Avisos (feed para la campana) -------------------------------------------
// `ts` (ISO) ordena el feed (más nuevo arriba) y alimenta el contador de "no
// vistos" de la campana (comparado con la última visita a /avisos).
export interface Aviso { id: string; texto: string; cuando: string; to: string; ts: string }

export async function listAvisos(): Promise<Aviso[]> {
  const avisos: Aviso[] = []
  const nowISO = new Date().toISOString()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return avisos

  // Mensajes recientes del tablón: SOLO los ya publicados y para todos (no
  // borradores/pendientes ni los privados a administración, que la RLS deja ver
  // a gestión/autor pero NO deben salir en la campana). El toque abre el tablón
  // (Home), que es donde el vecino los lee como post-its — no la pantalla Mensajes.
  const { data: msgs } = await supabase.from('mensajes')
    .select('id, tipo, titulo, created_at').eq('activo', true)
    .eq('estado', 'publicado').eq('destino', 'todos')
    .or(`publica_at.is.null,publica_at.lte.${nowISO}`)
    .order('created_at', { ascending: false }).limit(3)
  const ETIQ: Record<string, string> = { aviso: 'Aviso', anuncio: 'Anuncio', incidencia: 'Incidencia', sugerencia: 'Sugerencia' }
  for (const m of msgs ?? []) {
    avisos.push({ id: `msg-${m.id}`, texto: `${ETIQ[m.tipo as string] ?? 'Mensaje'}: ${m.titulo}`, cuando: fechaCorta(m.created_at as string), to: '/', ts: m.created_at as string })
  }

  // Solicitudes de acceso PENDIENTES (para gestión). La RLS de access_requests
  // solo deja verlas a quien puede aprobar altas, así que este bloque queda
  // vacío para el resto de vecinos. Cada una es un aviso que abre el panel.
  const { data: solicitudes } = await supabase.from('access_requests')
    .select('id, nombre, vivienda, created_at')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(10)
  for (const s of solicitudes ?? []) {
    avisos.push({
      id: `alta-${s.id}`,
      texto: `Nueva solicitud de acceso: ${s.nombre} (${s.vivienda ?? '—'})`,
      cuando: fechaCorta(s.created_at as string),
      to: '/admin',
      ts: s.created_at as string,
    })
  }

  // Buzón: respuestas a mis hilos (como vecino) y mensajes nuevos de mi canal
  // (como staff). La RLS ya limita los hilos visibles a mi canal.
  const { count: resp } = await supabase.from('hilos').select('*', { count: 'exact', head: true })
    .eq('vecino_id', user.id).eq('no_leido_vecino', true)
  if (resp) avisos.push({ id: 'buzon-v', texto: 'Tienes una respuesta en el buzón', cuando: 'Buzón', to: '/buzon', ts: nowISO })
  const { count: nuevos } = await supabase.from('hilos').select('*', { count: 'exact', head: true })
    .neq('vecino_id', user.id).eq('no_leido_gestion', true)
  if (nuevos) avisos.push({ id: 'buzon-g', texto: `${nuevos} mensaje(s) sin leer en el buzón`, cuando: 'Buzón', to: '/buzon', ts: nowISO })

  // Encuesta abierta: apertura <= now <= cierre.
  const { data: encuestas } = await supabase.from('encuestas')
    .select('id, titulo, apertura, cierre')
    .lte('apertura', nowISO)
    .gte('cierre', nowISO)
    .order('apertura', { ascending: false })
    .limit(1)
  const abierta = (encuestas ?? [])[0]
  if (abierta) {
    avisos.push({ id: 'av-enc', texto: `Votación abierta: ${abierta.titulo}`, cuando: 'Ahora', to: `/votaciones/${abierta.id}`, ts: abierta.apertura as string })
  }

  // Reserva propia aprobada.
  const { data: reservas } = await supabase.from('reservas')
    .select('id, inicio, created_at, zona:zonas_comunes(nombre)')
    .eq('solicitada_por', user.id)
    .eq('estado', 'aprobada')
    .order('inicio', { ascending: false })
    .limit(1)
  const miReserva = (reservas ?? [])[0] as { id: string; inicio: string; created_at: string; zona?: { nombre: string } | { nombre: string }[] | null } | undefined
  if (miReserva) {
    const z = Array.isArray(miReserva.zona) ? miReserva.zona[0] : miReserva.zona
    avisos.push({ id: 'av-res', texto: `Tu reserva de ${z?.nombre ?? ''} está aprobada`, cuando: fechaCorta(miReserva.inicio), to: '/reservas', ts: miReserva.created_at })
  }

  // Más nuevo arriba.
  return avisos.sort((a, b) => b.ts.localeCompare(a.ts))
}
