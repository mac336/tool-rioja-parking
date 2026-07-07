// Admin (solicitudes de acceso, gestión de vecinos, avisos) — implementación
// real (Supabase). Firmas idénticas al mock (src/lib/apiMock.ts). RLS decide
// qué ve gestión; las operaciones sensibles (alta, suspensión, cambio de rol)
// pasan por Edge Functions con service_role, no por escritura directa.
import { supabase } from '@/lib/supabase'
import type { AccessRequest, Profile, Role } from '@/types'
import { iniciales, fechaCorta } from '@/lib/format'

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
    return
  }
  const { error } = await supabase.from('access_requests')
    .update({ estado: 'rechazada' }).eq('id', id)
  if (error) throw error
}

// Alta pública: pasa por la Edge Function (captcha + rate-limit + service_role).
export async function crearSolicitud(input: { nombre: string; email: string; vivienda: string; comentario?: string }): Promise<void> {
  const { error } = await supabase.functions.invoke('solicitar-acceso', { body: input })
  if (error) throw error
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

// ---- Avisos (feed para la campana) -------------------------------------------
export interface Aviso { id: string; texto: string; cuando: string; to: string }

export async function listAvisos(): Promise<Aviso[]> {
  const avisos: Aviso[] = []
  const nowISO = new Date().toISOString()
  const hoyISO = nowISO.slice(0, 10)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return avisos

  // Perfil del usuario (rol + vivienda) para saber si es gestión.
  const { data: perfil } = await supabase.from('profiles')
    .select('rol, vivienda').eq('id', user.id).single()
  const esGestion = !!perfil && perfil.rol !== 'vecino'

  // Encuesta abierta: apertura <= now <= cierre.
  const { data: encuestas } = await supabase.from('encuestas')
    .select('id, titulo, apertura, cierre')
    .lte('apertura', nowISO)
    .gte('cierre', nowISO)
    .order('apertura', { ascending: false })
    .limit(1)
  const abierta = (encuestas ?? [])[0]
  if (abierta) {
    avisos.push({ id: 'av-enc', texto: `Votación abierta: ${abierta.titulo}`, cuando: 'Ahora', to: `/votaciones/${abierta.id}` })
  }

  // Anuncio publicado, vigente y de nivel principal.
  const { data: anuncios } = await supabase.from('anuncios')
    .select('id, titulo, publicado_at, created_at')
    .eq('estado', 'publicado')
    .eq('nivel', 'principal')
    .lte('fecha_inicio', hoyISO)
    .gte('fecha_fin', hoyISO)
    .order('publicado_at', { ascending: false })
    .limit(1)
  const principal = (anuncios ?? [])[0]
  if (principal) {
    avisos.push({ id: 'av-anun', texto: `Nuevo anuncio destacado: ${principal.titulo}`, cuando: fechaCorta(principal.publicado_at ?? principal.created_at), to: '/anuncios' })
  }

  // Reserva propia aprobada.
  const { data: reservas } = await supabase.from('reservas')
    .select('id, inicio, zona:zonas_comunes(nombre)')
    .eq('solicitada_por', user.id)
    .eq('estado', 'aprobada')
    .order('inicio', { ascending: false })
    .limit(1)
  const miReserva = (reservas ?? [])[0] as { id: string; inicio: string; zona?: { nombre: string } | { nombre: string }[] | null } | undefined
  if (miReserva) {
    const z = Array.isArray(miReserva.zona) ? miReserva.zona[0] : miReserva.zona
    avisos.push({ id: 'av-res', texto: `Tu reserva de ${z?.nombre ?? ''} está aprobada`, cuando: fechaCorta(miReserva.inicio), to: '/reservas/mias' })
  }

  // Colas de moderación (solo gestión).
  if (esGestion) {
    const { count: pend } = await supabase.from('anuncios')
      .select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
    if (pend) avisos.push({ id: 'av-mod', texto: `${pend} anuncio(s) esperando moderación`, cuando: 'Pendiente', to: '/anuncios' })

    const { count: pendRes } = await supabase.from('reservas')
      .select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
    if (pendRes) avisos.push({ id: 'av-modres', texto: `${pendRes} reserva(s) por aprobar`, cuando: 'Pendiente', to: '/reservas' })
  }

  return avisos
}
