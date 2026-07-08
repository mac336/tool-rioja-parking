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

/** Envía `payload` a todos los dispositivos suscritos del usuario. */
export async function enviarPush(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<void> {
  if (!configurado) return
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
  if (!subs || subs.length === 0) return

  await Promise.all((subs as SubRow[]).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
    } catch (e) {
      // 404/410 → la suscripción ya no es válida: la limpiamos.
      const code = (e as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
  }))
}
