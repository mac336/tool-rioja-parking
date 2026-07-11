// Edge Function: notificar
// Notificación push unificada de mensajería:
//  - kind 'mensaje': un mensaje público nuevo → push a TODOS los vecinos activos.
//  - kind 'buzon':   un mensaje del buzón → si lo escribió gestión, push al vecino
//                    del hilo; si lo escribió el vecino, push a la gestión.
// La app la llama tras crear el elemento. Requiere usuario activo.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { enviarPush, enviarPushATodos, enviarPushAUsuarios, idsPorRoles } from '../_shared/push.ts'

const ROLES_CANAL: Record<string, string[]> = {
  administrador: ['administrador_finca'],
  presidencia: ['presidente', 'vicepresidente'],
  conserje: ['conserje'],
  desarrollador: ['app_admin'],
}
const CANAL_LABEL: Record<string, string> = { administrador: 'Administración', presidencia: 'Presidencia', conserje: 'Conserje', desarrollador: 'Desarrollador de la app' }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? ''
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''

const TIPO_LABEL: Record<string, string> = { aviso: 'aviso', anuncio: 'anuncio', incidencia: 'incidencia' }

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
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Sin permiso.' }, 403)

    const { kind, id } = await req.json()

    if (kind === 'mensaje') {
      // SEGURIDAD: solo quien puede publicar mensajes dispara el push masivo
      // (si no, cualquier vecino podría spamear a todo el edificio).
      let puede = perfil.rol === 'app_admin'
      if (!puede) {
        const { data: perm } = await admin.from('role_permissions')
          .select('permiso').eq('rol', perfil.rol).eq('permiso', 'publicar_mensajes').maybeSingle()
        puede = !!perm
      }
      if (!puede) return json({ error: 'Sin permiso.' }, 403)
      const { data: m } = await admin.from('mensajes').select('tipo, titulo').eq('id', id).single()
      if (!m) return json({ ok: true, skipped: 'sin mensaje' })
      await enviarPushATodos(admin, {
        title: `Nuevo ${TIPO_LABEL[m.tipo] ?? 'mensaje'} en la comunidad`,
        body: m.titulo as string,
        url: '/mensajes',
      })
      return json({ ok: true })
    }

    if (kind === 'buzon') {
      // SEGURIDAD: solo puede disparar el aviso quien PUEDE VER el hilo (su
      // dueño o el rol del canal). Se comprueba con el cliente del usuario, que
      // pasa por la RLS (hilo_sel): si no lo ve, no autoriza.
      const { data: visible } = await asUser.from('hilos').select('id').eq('id', id).maybeSingle()
      if (!visible) return json({ error: 'Sin permiso.' }, 403)
      const { data: h } = await admin.from('hilos').select('id, vecino_id, asunto, canal').eq('id', id).single()
      if (!h) return json({ ok: true, skipped: 'sin hilo' })
      const canal = h.canal as string
      // Último mensaje del hilo → decide destinatario.
      const { data: ultimo } = await admin.from('hilo_mensajes')
        .select('de_gestion, texto').eq('hilo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!ultimo) return json({ ok: true, skipped: 'sin mensajes' })
      const body = (ultimo.texto as string).slice(0, 120)
      if (ultimo.de_gestion) {
        // Escribe la gestión → push al vecino del hilo y, además, CORREO a los
        // correos registrados de su piso (petición explícita: un mensaje directo
        // de gestión debe llegar aunque el vecino no use la app; no lo gobierna
        // el flag CORREOS_NOTIFICACION porque no es una notificación masiva).
        await enviarPush(admin, h.vecino_id as string, { title: `Mensaje de ${CANAL_LABEL[canal] ?? 'administración'}`, body, url: '/buzon' })
        try {
          if (GMAIL_USER && GMAIL_APP_PASSWORD) {
            const { data: dueño } = await admin.from('profiles').select('email, vivienda').eq('id', h.vecino_id).single()
            let correos: string[] = dueño?.email ? [dueño.email as string] : []
            if (dueño?.vivienda) {
              const { data: delPiso } = await admin.from('profiles')
                .select('email').eq('vivienda', dueño.vivienda).eq('estado', 'activo')
              correos = [...new Set((delPiso ?? []).map((p) => p.email as string).filter(Boolean).concat(correos))]
            }
            if (correos.length > 0) {
              const client = new SMTPClient({
                connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
              })
              await client.send({
                from: `Comunidad Rioja 25 <${GMAIL_USER}>`,
                to: correos,
                subject: `Tienes un mensaje de ${CANAL_LABEL[canal] ?? 'la gestión'} — Rioja 25`,
                content: `${CANAL_LABEL[canal] ?? 'La gestión'} te ha escrito por el buzón de la app:\n\n«${(ultimo.texto as string).slice(0, 500)}»\n\nEntra en la app para leerlo y responder:\nhttps://tool-rioja-parking.vercel.app/buzon\n\n— Comunidad Rioja 25`,
              })
              await client.close()
            }
          }
        } catch (_e) { /* el correo es best-effort; el push ya salió */ }
      } else {
        // Escribe el vecino → avisa SOLO a los roles del canal (privacidad).
        const destinatarios = await idsPorRoles(admin, ROLES_CANAL[canal] ?? [])
        await enviarPushAUsuarios(admin, destinatarios, { title: `Nuevo mensaje (${CANAL_LABEL[canal] ?? 'buzón'}): ${h.asunto}`, body, url: '/buzon' })
      }
      return json({ ok: true })
    }

    return json({ error: 'kind no reconocido.' }, 400)
  } catch (_e) {
    return json({ error: 'No se pudo notificar.' }, 500)
  }
})
