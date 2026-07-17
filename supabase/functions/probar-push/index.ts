// Edge Function: probar-push (diagnóstico)
// Envía una notificación de PRUEBA a las suscripciones del PROPIO usuario que
// llama, y devuelve el detalle del intento (si hay VAPID, la clave pública del
// servidor y el error exacto por suscripción). Sirve para saber por qué no
// llegan las push (p. ej. clave pública del cliente que no casa con la del
// servidor → el servicio de push las rechaza en silencio).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:cdelarioja25@gmail.com'

let configurado = false
try {
  if (VAPID_PUBLIC && VAPID_PRIVATE) { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); configurado = true }
} catch (_e) { configurado = false }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: perfil } = await admin.from('profiles').select('estado').eq('id', user.id).single()
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Sin permiso.' }, 403)

    const { data: subs } = await admin.from('push_subscriptions')
      .select('endpoint, p256dh, auth').eq('user_id', user.id)

    const payload = JSON.stringify({
      title: 'Prueba de notificación ✅',
      body: 'Si ves esto, las notificaciones funcionan.',
      url: '/',
    })

    const resultados: { host: string; ok: boolean; code?: number; message?: string }[] = []
    for (const s of subs ?? []) {
      let host = ''
      try { host = new URL(s.endpoint as string).host } catch (_e) { host = '¿endpoint?' }
      if (!configurado) { resultados.push({ host, ok: false, message: 'Servidor sin claves VAPID' }); continue }
      try {
        await webpush.sendNotification({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } }, payload)
        resultados.push({ host, ok: true })
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode
        const body = (e as { body?: string })?.body
        resultados.push({ host, ok: false, code, message: String(body ?? (e as Error)?.message ?? e).slice(0, 200) })
      }
    }

    return json({
      configurado,
      vapidPublicServidor: VAPID_PUBLIC ? `${VAPID_PUBLIC.slice(0, 12)}… (len ${VAPID_PUBLIC.length})` : '(vacía)',
      totalSuscripciones: subs?.length ?? 0,
      enviadas: resultados.filter((r) => r.ok).length,
      resultados,
    })
  } catch (e) {
    return json({ error: 'Error en la prueba.', detalle: String((e as Error)?.message ?? e).slice(0, 200) }, 500)
  }
})
