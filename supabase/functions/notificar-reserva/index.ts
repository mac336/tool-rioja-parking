// Edge Function: notificar-reserva
// Avisa al vecino solicitante cuando su reserva se aprueba o rechaza: por correo
// (Gmail SMTP) y, si tiene suscripción, por notificación push. La llama la app
// tras resolver la reserva. El llamante debe ser gestión (permiso 'panel').
// Solo se usa cuando el flag app_config.reservas_requieren_aprobacion está ON.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { enviarPush } from '../_shared/push.ts'
import { CORREOS_NOTIFICACION } from '../_shared/config.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? ''
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''

const fmtFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))
const fmtHora = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', timeStyle: 'short' }).format(new Date(iso))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    // 1) Autorización: el llamante debe poder aprobar reservas.
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: perfil } = await admin.from('profiles').select('rol, estado').eq('id', user.id).single()
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Sin permiso.' }, 403)
    // Aprueban las reservas: la gestión (permiso 'panel'). app_admin siempre.
    if (perfil.rol !== 'app_admin') {
      const { data: perm } = await admin.from('role_permissions')
        .select('permiso').eq('rol', perfil.rol).eq('permiso', 'panel').maybeSingle()
      if (!perm) return json({ error: 'Sin permiso.' }, 403)
    }

    // 2) Leer el grupo de reserva y su solicitante.
    const { grupoId, aprobar } = await req.json()
    // Validar UUID antes de interpolarlo en el filtro .or() (evita inyección
    // de sintaxis de filtro PostgREST).
    if (!grupoId || !/^[0-9a-fA-F-]{36}$/.test(String(grupoId))) return json({ error: 'grupoId no válido.' }, 400)
    const { data: filas } = await admin.from('reservas')
      .select('solicitada_por, inicio, fin, zona:zonas_comunes(nombre)')
      .or(`grupo_id.eq.${grupoId},id.eq.${grupoId}`)
    if (!filas || filas.length === 0) return json({ ok: true, skipped: 'sin filas' })

    const zonas = filas.map((f) => {
      const z = f.zona as { nombre: string } | { nombre: string }[] | null
      return Array.isArray(z) ? z[0]?.nombre : z?.nombre
    }).filter(Boolean).join(' + ')
    const inicio = filas[0].inicio as string
    const fin = filas[0].fin as string
    const solicitante = filas[0].solicitada_por as string

    const { data: dueño } = await admin.from('profiles').select('nombre, email').eq('id', solicitante).single()
    if (!dueño?.email) return json({ ok: true, skipped: 'sin correo del solicitante' })

    const estadoTxt = aprobar ? 'APROBADA' : 'rechazada'
    const cuando = `${fmtFecha(inicio)}–${fmtHora(fin)}`
    const asunto = aprobar ? `Reserva aprobada — ${zonas}` : `Reserva rechazada — ${zonas}`
    const cuerpo = aprobar
      ? `Hola ${dueño.nombre}:\n\nTu reserva ha sido APROBADA.\n\nZona(s): ${zonas}\nCuándo: ${cuando}\n\nPuedes verla en la app, en "Mis reservas".\n\n— Comunidad Rioja 25`
      : `Hola ${dueño.nombre}:\n\nTu solicitud de reserva ha sido rechazada.\n\nZona(s): ${zonas}\nCuándo: ${cuando}\n\nPuedes solicitar otra desde la app.\n\n— Comunidad Rioja 25`

    // 3) Correo (si los correos de notificación están activados y hay SMTP).
    if (CORREOS_NOTIFICACION && GMAIL_USER && GMAIL_APP_PASSWORD) {
      try {
        const client = new SMTPClient({
          connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
        })
        await client.send({ from: `App Rioja 25 <${GMAIL_USER}>`, to: dueño.email, subject: asunto, content: cuerpo })
        await client.close()
      } catch (_e) { /* no bloquea el push si el correo falla */ }
    }

    // 4) Push a los dispositivos del solicitante (si tiene suscripciones).
    await enviarPush(admin, solicitante, {
      title: aprobar ? '✅ Reserva aprobada' : 'Reserva rechazada',
      body: `${zonas} · ${cuando}`,
      url: '/reservas/mias',
    }).catch(() => undefined)

    return json({ ok: true, estado: estadoTxt })
  } catch (_e) {
    return json({ error: 'No se pudo notificar la reserva.' }, 500)
  }
})
