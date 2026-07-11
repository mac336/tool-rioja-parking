// Edge Function: enviar-sugerencia
// Un vecino activo envía una sugerencia sobre la app; se manda por correo (Gmail
// SMTP) a la cuenta de la comunidad. El nombre/vivienda del remitente los toma el
// servidor del profile (no del cliente). Usa una contraseña de aplicación de
// Gmail en variables de entorno del servidor (nunca en el cliente). Ver specs/11.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { enviarPushAUsuarios, idsPorRoles } from '../_shared/push.ts'
import { CORREOS_NOTIFICACION } from '../_shared/config.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? ''
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''
// Buzón de la comunidad al que llegan las sugerencias.
const SUGERENCIAS_TO = Deno.env.get('SUGERENCIAS_TO') ?? 'cdelarioja25@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    // 1) Identificar al vecino por su JWT y exigir que esté activo.
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: perfil } = await admin.from('profiles').select('nombre, vivienda, estado, rol').eq('id', user.id).single()
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Solo los vecinos activos pueden enviar sugerencias.' }, 403)
    if (perfil.rol === 'tester') return json({ error: 'Las cuentas de prueba son de solo lectura.' }, 403)

    // 2) Validar el texto.
    const { texto } = await req.json()
    const cuerpo = typeof texto === 'string' ? texto.trim() : ''
    if (cuerpo.length < 3 || cuerpo.length > 4000) return json({ error: 'La sugerencia debe tener entre 3 y 4000 caracteres.' }, 400)

    // 3) GUARDAR la sugerencia en BD (fuente de verdad: el push puede perderse).
    await admin.from('sugerencias').insert({
      autor_id: user.id, nombre: perfil.nombre, vivienda: perfil.vivienda, texto: cuerpo,
    })

    // 4) Aviso al desarrollador (app_admin) por PUSH — canal principal ahora que
    //    los correos de notificación están desactivados.
    const idsDev = await idsPorRoles(admin, ['app_admin'])
    await enviarPushAUsuarios(admin, idsDev, {
      title: '💡 Nueva sugerencia',
      body: `${perfil.nombre} (${perfil.vivienda ?? 'sin vivienda'}): ${cuerpo.slice(0, 140)}`,
      url: '/dashboard',
    }).catch(() => undefined)

    // 4) Correo (solo si los correos de notificación están activados y hay SMTP).
    if (CORREOS_NOTIFICACION && GMAIL_APP_PASSWORD && GMAIL_USER) {
      const client = new SMTPClient({
        connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
      })
      await client.send({
        from: `App Rioja 25 <${GMAIL_USER}>`,
        to: SUGERENCIAS_TO,
        replyTo: user.email ?? undefined,
        subject: `Sugerencia — ${perfil.nombre} (${perfil.vivienda})`,
        content:
          `Nueva sugerencia desde la app Rioja 25.\n\n` +
          `De: ${perfil.nombre} · ${perfil.vivienda}\n` +
          `Correo: ${user.email ?? '—'}\n\n` +
          `Sugerencia:\n${cuerpo}\n`,
      })
      await client.close()
    }

    return json({ ok: true })
  } catch (_e) {
    return json({ error: 'No se pudo enviar la sugerencia.' }, 500)
  }
})
