// Edge Function: solicitar-acceso
// Único punto anónimo del sistema. Verifica captcha (Turnstile) y rate-limit EN
// SERVIDOR, sanea la entrada e inserta la solicitud con service_role (la tabla
// access_requests NO admite INSERT anónimo). Ver specs/03 y specs/11.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { enviarPushAUsuarios } from '../_shared/push.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''

async function verificarCaptcha(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true // dev: sin secreto configurado, no bloquea
  const body = new FormData()
  body.append('secret', TURNSTILE_SECRET)
  body.append('response', token)
  if (ip) body.append('remoteip', ip)
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const data = await r.json()
  return !!data.success
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const { nombre, email, vivienda, comentario, esInquilino, captchaToken } = await req.json()
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? ''

    // Validación / saneado básico
    const nombreT = String(nombre ?? '').trim().slice(0, 120)
    const emailT = String(email ?? '').trim().toLowerCase().slice(0, 200)
    const viviendaT = String(vivienda ?? '').trim().slice(0, 40)
    const comentarioT = String(comentario ?? '').trim().slice(0, 500)
    const esInquilinoB = esInquilino === true
    if (!nombreT || !/.+@.+\..+/.test(emailT) || !viviendaT) {
      return json({ error: 'Datos incompletos.' }, 400)
    }

    // Captcha (servidor)
    if (!(await verificarCaptcha(String(captchaToken ?? ''), ip))) {
      return json({ error: 'Verificación de captcha fallida.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Rate-limit sencillo: máx. 3 solicitudes/hora por email.
    const desde = new Date(Date.now() - 3_600_000).toISOString()
    const { count } = await admin
      .from('access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('email', emailT)
      .gte('created_at', desde)
    if ((count ?? 0) >= 3) {
      // Mensaje neutro (no revela existencia): responde igual que éxito.
      return json({ ok: true })
    }

    // La vivienda debe existir en el catálogo y ser un PISO real (no especial).
    const { data: viv } = await admin.from('viviendas').select('codigo, es_piso').eq('codigo', viviendaT).maybeSingle()
    if (!viv || viv.es_piso === false) return json({ error: 'Vivienda no válida.' }, 400)

    await admin.from('access_requests').insert({
      nombre: nombreT, email: emailT, vivienda: viviendaT, comentario: comentarioT || null,
      es_inquilino: esInquilinoB,
    })

    // Avisar a la gestión por push DIRECTAMENTE (sin salto a otra función: el
    // gateway de Supabase rechaza las llamadas función-a-función con la service
    // key nueva `sb_secret…`, así que el aviso se envía aquí mismo).
    try {
      const { data: admins } = await admin.from('profiles')
        .select('id').in('rol', ['app_admin', 'presidente', 'administrador_finca']).eq('estado', 'activo')
      const ids = (admins ?? []).map((a) => a.id as string)
      await enviarPushAUsuarios(admin, ids, {
        title: 'Nueva solicitud de acceso',
        body: `${nombreT} (${viviendaT}) quiere acceder. Toca para revisarla.`,
        url: '/admin',
      })
    } catch (_) { /* no bloquear la solicitud si falla el aviso */ }

    // Mensaje idéntico exista o no el correo (anti-enumeración, specs/11)
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Error procesando la solicitud.' }, 500)
  }
})
