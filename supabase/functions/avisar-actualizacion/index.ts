// Edge Function: avisar-actualizacion
// El app_admin envía un push a los vecinos que NO están en la última versión
// (app_version distinta de la actual, o desconocida) pidiéndoles CERRAR la app
// del todo y reabrirla. El texto se adapta a iPhone/Android según el user_agent.
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
try { if (VAPID_PUBLIC && VAPID_PRIVATE) { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); configurado = true } } catch (_e) { configurado = false }

const TITULO = 'Rioja 25 · nueva versión'
function cuerpoPara(ua: string): string {
  const s = (ua || '').toLowerCase()
  if (/iphone|ipad|ipod/.test(s))
    return 'Para actualizar, cierra la app del todo: en el selector de apps desliza Rioja 25 hacia arriba y vuelve a abrirla.'
  if (/android/.test(s))
    return 'Para actualizar, cierra la app del todo: en las apps recientes desliza Rioja 25 para cerrarla y vuelve a abrirla.'
  return 'Para actualizar, cierra la aplicación por completo y vuelve a abrirla.'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: perfil } = await admin.from('profiles').select('rol, estado').eq('id', user.id).single()
    if (!perfil || perfil.estado !== 'activo' || perfil.rol !== 'app_admin') {
      return json({ error: 'Solo el administrador de la app puede enviar este aviso.' }, 403)
    }

    const { version } = await req.json()
    const v = String(version ?? '').trim()

    // Vecinos activos que NO están en la última versión (o desconocida).
    const { data: perfiles } = await admin.from('profiles')
      .select('id, app_version').eq('estado', 'activo')
    const desactualizados = (perfiles ?? []).filter((p) => !p.app_version || p.app_version !== v).map((p) => p.id as string)
    if (desactualizados.length === 0) return json({ ok: true, desactualizados: 0, dispositivos: 0, enviados: 0 })

    const { data: subs } = await admin.from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_agent').in('user_id', desactualizados)

    let enviados = 0
    if (configurado) {
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
            JSON.stringify({ title: TITULO, body: cuerpoPara(s.user_agent as string), url: '/' }),
          )
          enviados++
        } catch (e) {
          const code = (e as { statusCode?: number })?.statusCode
          if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      }
    }
    return json({ ok: true, desactualizados: desactualizados.length, dispositivos: (subs ?? []).length, enviados })
  } catch (e) {
    return json({ error: 'Error enviando el aviso.', detalle: String((e as Error)?.message ?? e).slice(0, 200) }, 500)
  }
})
