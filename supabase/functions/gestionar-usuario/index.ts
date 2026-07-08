// Edge Function: gestionar-usuario
// Cambios de rol/estado de un vecino — SOLO server-side con service_role (el
// cliente nunca escribe rol/estado, specs/11). El llamante debe tener permiso de
// altas (app_admin / presidente / administrador_finca).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

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
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Sin permiso para gestionar usuarios.' }, 403)
    // Permiso 'aprobar_altas' (personalizable). app_admin siempre puede.
    if (perfil.rol !== 'app_admin') {
      const { data: perm } = await admin.from('role_permissions')
        .select('permiso').eq('rol', perfil.rol).eq('permiso', 'aprobar_altas').maybeSingle()
      if (!perm) return json({ error: 'Sin permiso para gestionar usuarios.' }, 403)
    }

    const { accion, userId, rol, nombre, vivienda } = await req.json()
    if (!userId || userId === user.id) return json({ error: 'Objetivo no válido.' }, 400)

    if (accion === 'suspender') {
      await admin.from('profiles').update({ estado: 'suspendido' }).eq('id', userId)
    } else if (accion === 'baja') {
      // Baja reversible: bloquea el acceso y libera la plaza, conserva el historial.
      await admin.from('profiles').update({ estado: 'baja' }).eq('id', userId)
    } else if (accion === 'reactivar') {
      await admin.from('profiles').update({ estado: 'activo' }).eq('id', userId)
    } else if (accion === 'rol') {
      if (!ROLES_VALIDOS.includes(rol)) return json({ error: 'Rol no válido.' }, 400)
      await admin.from('profiles').update({ rol }).eq('id', userId)
    } else if (accion === 'editar') {
      // Corrige datos del vecino (nombre/alias y/o vivienda).
      const patch: Record<string, string> = {}
      if (typeof nombre === 'string') {
        const n = nombre.trim()
        if (n.length < 1 || n.length > 80) return json({ error: 'Nombre no válido.' }, 400)
        patch.nombre = n
      }
      if (typeof vivienda === 'string') {
        const { data: viv } = await admin.from('viviendas').select('codigo').eq('codigo', vivienda).maybeSingle()
        if (!viv) return json({ error: 'Vivienda no válida.' }, 400)
        patch.vivienda = vivienda
      }
      if (Object.keys(patch).length === 0) return json({ error: 'Nada que actualizar.' }, 400)
      await admin.from('profiles').update(patch).eq('id', userId)
    } else {
      return json({ error: 'Acción no reconocida.' }, 400)
    }

    return json({ ok: true })
  } catch (_e) {
    return json({ error: 'Error gestionando el usuario.' }, 500)
  }
})
