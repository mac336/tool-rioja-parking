// Envío de notificaciones push (Web Push / VAPID). Lee las suscripciones del
// usuario de la tabla push_subscriptions y les manda el aviso. Si no hay claves
// VAPID configuradas o el usuario no tiene suscripciones, no hace nada.
import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:cdelarioja25@gmail.com'

let configurado = false
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configurado = true
}

export interface PushPayload { title: string; body: string; url?: string }

interface SubRow { endpoint: string; p256dh: string; auth: string }

async function enviarASubs(admin: SupabaseClient, subs: SubRow[], payload: PushPayload): Promise<void> {
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
  }))
}

/** Envía `payload` a todos los dispositivos suscritos del usuario. */
export async function enviarPush(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<void> {
  if (!configurado) return
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
  if (subs?.length) await enviarASubs(admin, subs as SubRow[], payload)
}

/** Envía `payload` a una lista de usuarios. */
export async function enviarPushAUsuarios(admin: SupabaseClient, userIds: string[], payload: PushPayload): Promise<void> {
  if (!configurado || userIds.length === 0) return
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', userIds)
  if (subs?.length) await enviarASubs(admin, subs as SubRow[], payload)
}

/** Envía `payload` a TODOS los vecinos activos con suscripción. */
export async function enviarPushATodos(admin: SupabaseClient, payload: PushPayload): Promise<void> {
  if (!configurado) return
  const { data: activos } = await admin.from('profiles').select('id').eq('estado', 'activo')
  const ids = (activos ?? []).map((p) => p.id as string)
  await enviarPushAUsuarios(admin, ids, payload)
}

/** IDs de usuarios activos cuyo ROL tiene el permiso indicado (app_admin siempre). */
export async function idsConPermiso(admin: SupabaseClient, permiso: string): Promise<string[]> {
  const { data: perms } = await admin.from('role_permissions').select('rol').eq('permiso', permiso)
  const roles = new Set((perms ?? []).map((p) => p.rol as string))
  roles.add('app_admin') // SUPERADMIN: siempre tiene todos los permisos
  return idsPorRoles(admin, [...roles])
}

/** IDs de usuarios de gestión (permiso 'panel' o app_admin), activos. */
export async function idsGestion(admin: SupabaseClient): Promise<string[]> {
  return idsConPermiso(admin, 'panel')
}

/** IDs de usuarios activos con alguno de los roles indicados. */
export async function idsPorRoles(admin: SupabaseClient, roles: string[]): Promise<string[]> {
  if (roles.length === 0) return []
  const { data } = await admin.from('profiles').select('id, rol').eq('estado', 'activo')
  const set = new Set(roles)
  return (data ?? []).filter((p) => set.has(p.rol as string)).map((p) => p.id as string)
}
