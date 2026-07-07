// Edge Function: solicitar-acceso
// Único punto anónimo del sistema. Verifica captcha (Turnstile) y rate-limit EN
// SERVIDOR, sanea la entrada e inserta la solicitud con service_role (la tabla
// access_requests NO admite INSERT anónimo). Ver specs/03 y specs/11.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

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
    const { nombre, email, vivienda, comentario, captchaToken } = await req.json()
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? ''

    // Validación / saneado básico
    const nombreT = String(nombre ?? '').trim().slice(0, 120)
    const emailT = String(email ?? '').trim().toLowerCase().slice(0, 200)
    const viviendaT = String(vivienda ?? '').trim().slice(0, 40)
    const comentarioT = String(comentario ?? '').trim().slice(0, 500)
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

    // La vivienda debe existir en el catálogo
    const { data: viv } = await admin.from('viviendas').select('codigo').eq('codigo', viviendaT).maybeSingle()
    if (!viv) return json({ error: 'Vivienda no válida.' }, 400)

    await admin.from('access_requests').insert({
      nombre: nombreT, email: emailT, vivienda: viviendaT, comentario: comentarioT || null,
    })

    // Avisar a los administradores (best-effort)
    try {
      await admin.functions.invoke('notificar-admin', { body: { nombre: nombreT, vivienda: viviendaT } })
    } catch (_) { /* no bloquear la solicitud si falla el aviso */ }

    // Mensaje idéntico exista o no el correo (anti-enumeración, specs/11)
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Error procesando la solicitud.' }, 500)
  }
})
