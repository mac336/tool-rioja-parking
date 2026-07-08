// Edge Function: aprobar-solicitud
// Server-side con service_role. El llamante debe estar autenticado y tener
// permiso para aprobar altas (app_admin/presidente/administrador_finca). Crea/
// invita al usuario, fija vivienda+rol+estado='activo' respetando el máx. 2
// cuentas/vivienda, y envía la invitación. Ver specs/03.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    // 1) Identificar al llamante por su JWT y comprobar permiso
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: perfil } = await admin.from('profiles').select('rol, estado').eq('id', user.id).single()
    if (!perfil || perfil.estado !== 'activo') return json({ error: 'Sin permiso para aprobar altas.' }, 403)
    if (perfil.rol !== 'app_admin') {
      const { data: perm } = await admin.from('role_permissions')
        .select('permiso').eq('rol', perfil.rol).eq('permiso', 'aprobar_altas').maybeSingle()
      if (!perm) return json({ error: 'Sin permiso para aprobar altas.' }, 403)
    }

    // 2) Datos de la solicitud
    const { requestId, vivienda, rol } = await req.json()
    const rolFinal = String(rol ?? 'vecino')
    const { data: solicitud } = await admin.from('access_requests').select('*').eq('id', requestId).single()
    if (!solicitud) return json({ error: 'Solicitud no encontrada.' }, 404)
    const viviendaFinal = String(vivienda ?? solicitud.vivienda)

    // 3) Máx. 2 cuentas por vivienda
    const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true })
      .eq('vivienda', viviendaFinal).in('estado', ['activo', 'pendiente'])
    if ((count ?? 0) >= 2) return json({ error: 'La vivienda ya tiene 2 cuentas.' }, 409)

    // 4) Invitar/crear el usuario en Auth por su correo y enviar el enlace de acceso
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(solicitud.email, {
      redirectTo: APP_ORIGIN || undefined,
    })
    let userId = invited?.user?.id
    if (invErr || !userId) {
      // Si ya existe en Auth, buscarlo
      const { data: list } = await admin.auth.admin.listUsers()
      userId = list.users.find((u) => u.email?.toLowerCase() === solicitud.email.toLowerCase())?.id
      if (!userId) return json({ error: 'No se pudo crear el usuario.' }, 500)
    }

    // 5) Crear/actualizar el profile con vivienda, rol y estado activo
    await admin.from('profiles').upsert({
      id: userId, email: solicitud.email, nombre: solicitud.nombre,
      vivienda: viviendaFinal, rol: rolFinal, estado: 'activo',
    })

    // 6) Marcar la solicitud como aprobada
    await admin.from('access_requests').update({ estado: 'aprobada', revisada_por: user.id }).eq('id', requestId)

    return json({ ok: true, userId })
  } catch (e) {
    return json({ error: 'Error aprobando la solicitud.' }, 500)
  }
})
