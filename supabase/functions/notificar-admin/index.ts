// Edge Function: notificar-admin
// Avisa por correo (Gmail SMTP) a los administradores de una nueva solicitud de
// acceso. Usa una contraseña de aplicación de Gmail en variables de entorno del
// servidor (nunca en el cliente). Ver specs/02 y specs/03.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? 'cdelarioja25@gmail.com'
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''

const ROLES_ADMIN = ['app_admin', 'presidente', 'administrador_finca']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const { nombre, vivienda } = await req.json()
    if (!GMAIL_APP_PASSWORD) {
      // Sin SMTP configurado (dev): no falla, solo informa.
      return json({ ok: true, skipped: 'SMTP no configurado' })
    }

    // Destinatarios: correos de los perfiles con permiso de altas
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: admins } = await admin.from('profiles').select('email').in('rol', ROLES_ADMIN).eq('estado', 'activo')
    const destinatarios = (admins ?? []).map((a) => a.email).filter(Boolean)
    if (destinatarios.length === 0) return json({ ok: true, skipped: 'sin destinatarios' })

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

    return json({ ok: true, enviados: destinatarios.length })
  } catch (e) {
    return json({ error: 'Error enviando el aviso.' }, 500)
  }
})
