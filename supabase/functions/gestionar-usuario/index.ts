// Edge Function: gestionar-usuario
// Cambios de rol/estado de un vecino — SOLO server-side con service_role (el
// cliente nunca escribe rol/estado, specs/11). El llamante debe tener permiso de
// altas (app_admin / presidente / administrador_finca).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? ''

const ROLES_VALIDOS = ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino', 'tester']

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

    const { accion, userId, rol, nombre, vivienda, email } = await req.json()

    // Alta DIRECTA (sin proceso de registro): crea el usuario en Auth y su
    // perfil activo. Pensado para que el admin dé de alta vecinos o cuentas de
    // prueba (rol 'tester'). El usuario entra luego con su código OTP.
    if (accion === 'crear') {
      const nombreT = String(nombre ?? '').trim().slice(0, 80)
      const emailT = String(email ?? '').trim().toLowerCase()
      const rolT = String(rol ?? 'vecino')
      if (!nombreT || !/.+@.+\..+/.test(emailT)) return json({ error: 'Nombre o correo no válidos.' }, 400)
      if (!ROLES_VALIDOS.includes(rolT)) return json({ error: 'Rol no válido.' }, 400)
      // Vivienda OPCIONAL: una cuenta puede no tener piso (p. ej. un tester).
      const viviendaRaw = String(vivienda ?? '').trim()
      let viviendaFinal: string | null = null
      if (viviendaRaw) {
        const { data: viv } = await admin.from('viviendas').select('codigo').eq('codigo', viviendaRaw).maybeSingle()
        if (!viv) return json({ error: 'Vivienda no válida.' }, 400)
        viviendaFinal = viv.codigo
      }

      // INVITAR por correo: crea el usuario en Auth y le envía una invitación
      // con un enlace que abre directamente la app (redirectTo=APP_ORIGIN).
      // Si ya existía en Auth, se localiza y no se reenvía nada.
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(emailT, {
        redirectTo: APP_ORIGIN || undefined,
      })
      let nuevoId = invited?.user?.id
      if (invErr || !nuevoId) {
        const { data: list } = await admin.auth.admin.listUsers()
        nuevoId = list.users.find((u) => u.email?.toLowerCase() === emailT)?.id
        if (!nuevoId) return json({ error: 'No se pudo crear el usuario.' }, 500)
      }
      await admin.from('profiles').upsert({
        id: nuevoId, email: emailT, nombre: nombreT,
        vivienda: viviendaFinal, rol: rolT, estado: 'activo',
      })
      return json({ ok: true, userId: nuevoId })
    }

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
      const patch: Record<string, string | null> = {}
      if (typeof nombre === 'string') {
        const n = nombre.trim()
        if (n.length < 1 || n.length > 80) return json({ error: 'Nombre no válido.' }, 400)
        patch.nombre = n
      }
      if (typeof vivienda === 'string') {
        const v = vivienda.trim()
        if (!v) {
          patch.vivienda = null // "Sin vivienda" (p. ej. tester)
        } else {
          const { data: viv } = await admin.from('viviendas').select('codigo').eq('codigo', v).maybeSingle()
          if (!viv) return json({ error: 'Vivienda no válida.' }, 400)
          patch.vivienda = v
        }
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
