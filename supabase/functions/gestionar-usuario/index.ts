// Edge Function: gestionar-usuario
// Cambios de rol/estado de un vecino — SOLO server-side con service_role (el
// cliente nunca escribe rol/estado, specs/11). El llamante debe tener permiso de
// altas (app_admin / presidente / administrador_finca).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

const ROLES_GESTION = ['app_admin', 'presidente', 'administrador_finca']
const ROLES_VALIDOS = ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'vecino']

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
    if (!perfil || perfil.estado !== 'activo' || !ROLES_GESTION.includes(perfil.rol)) {
      return json({ error: 'Sin permiso para gestionar usuarios.' }, 403)
    }

    const { accion, userId, rol } = await req.json()
    if (!userId || userId === user.id) return json({ error: 'Objetivo no válido.' }, 400)

    if (accion === 'suspender') {
      await admin.from('profiles').update({ estado: 'suspendido' }).eq('id', userId)
    } else if (accion === 'reactivar') {
      await admin.from('profiles').update({ estado: 'activo' }).eq('id', userId)
    } else if (accion === 'rol') {
      if (!ROLES_VALIDOS.includes(rol)) return json({ error: 'Rol no válido.' }, 400)
      await admin.from('profiles').update({ rol }).eq('id', userId)
    } else {
      return json({ error: 'Acción no reconocida.' }, 400)
    }

    return json({ ok: true })
  } catch (_e) {
    return json({ error: 'Error gestionando el usuario.' }, 500)
  }
})
