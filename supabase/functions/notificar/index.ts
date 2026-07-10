// Edge Function: notificar
// Notificación push unificada de mensajería:
//  - kind 'mensaje': un mensaje público nuevo → push a TODOS los vecinos activos.
//  - kind 'buzon':   un mensaje del buzón → si lo escribió gestión, push al vecino
//                    del hilo; si lo escribió el vecino, push a la gestión.
// La app la llama tras crear el elemento. Requiere usuario activo.
import { createClient } from 'jsr:@supabase/supabase-js@2'
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
    const { data: perfil } = await admin.from('profiles').select('estado').eq('id', user.id).single()
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Sin permiso.' }, 403)

    const { kind, id } = await req.json()

    if (kind === 'mensaje') {
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
      const { data: h } = await admin.from('hilos').select('id, vecino_id, asunto, canal').eq('id', id).single()
      if (!h) return json({ ok: true, skipped: 'sin hilo' })
      const canal = h.canal as string
      // Último mensaje del hilo → decide destinatario.
      const { data: ultimo } = await admin.from('hilo_mensajes')
        .select('de_gestion, texto').eq('hilo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!ultimo) return json({ ok: true, skipped: 'sin mensajes' })
      const body = (ultimo.texto as string).slice(0, 120)
      if (ultimo.de_gestion) {
        // Responde el canal → avisa al vecino del hilo.
        await enviarPush(admin, h.vecino_id as string, { title: `Respuesta de ${CANAL_LABEL[canal] ?? 'administración'}`, body, url: '/buzon' })
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
