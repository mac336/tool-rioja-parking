// Edge Function: notificar-admin
// Avisa por correo (Gmail SMTP) a los administradores de una nueva solicitud de
// acceso. Usa una contraseña de aplicación de Gmail en variables de entorno del
// servidor (nunca en el cliente). Ver specs/02 y specs/03.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { enviarPushAUsuarios } from '../_shared/push.ts'
import { CORREOS_NOTIFICACION } from '../_shared/config.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? 'cdelarioja25@gmail.com'
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''

const ROLES_ADMIN = ['app_admin', 'presidente', 'administrador_finca']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    // SEGURIDAD: solo se llama INTERNAMENTE (desde solicitar-acceso con la clave
    // de servicio). Rechaza llamadas del cliente (anon/usuario) para evitar spam
    // y phishing a los administradores.
    const authHeader = req.headers.get('Authorization') ?? ''
    if (authHeader !== `Bearer ${SERVICE_ROLE}`) return json({ error: 'No autorizado.' }, 403)

    const { nombre, vivienda } = await req.json()

    // Destinatarios: perfiles de gestión (roles con altas) activos.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: admins } = await admin.from('profiles').select('id, email').in('rol', ROLES_ADMIN).eq('estado', 'activo')
    const ids = (admins ?? []).map((a) => a.id as string)
    const destinatarios = (admins ?? []).map((a) => a.email).filter(Boolean) as string[]

    // 1) Push a gestión (best-effort; no depende del correo ni del spam).
    await enviarPushAUsuarios(admin, ids, {
      title: 'Nueva solicitud de acceso',
      body: `${nombre ?? 'Alguien'} (${vivienda ?? '—'}) quiere acceder. Toca para revisarla.`,
      url: '/admin',
    }).catch(() => undefined)

    // 2) Correo (si los correos de notificación están activados y hay SMTP).
    let enviadosCorreo = 0
    if (CORREOS_NOTIFICACION && GMAIL_APP_PASSWORD && destinatarios.length > 0) {
      const client = new SMTPClient({
        connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
      })
      await client.send({
        from: `Comunidad Rioja 25 <${GMAIL_USER}>`,
        to: destinatarios,
        subject: 'Nueva solicitud de acceso — Rioja 25',
        content: `Hay una nueva solicitud de acceso pendiente de revisar.\n\nSolicitante: ${nombre ?? '—'}\nVivienda: ${vivienda ?? '—'}\n\nEntra en la app para aprobarla o rechazarla.`,
      })
      await client.close()
      enviadosCorreo = destinatarios.length
    }

    return json({ ok: true, push: ids.length, correo: enviadosCorreo })
  } catch (e) {
    return json({ error: 'Error enviando el aviso.' }, 500)
  }
})
