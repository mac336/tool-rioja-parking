// Edge Function: acceso-directo (TEMPORAL)
// Deja entrar SOLO con el correo (sin código), para vecinos ya APROBADOS y
// activos. Pensado para gente mayor que se lía con el flujo del código OTP.
// Genera un token de magic link SIN enviar correo y lo canjea por una sesión,
// que devuelve al cliente (access_token + refresh_token). NO envía ningún correo.
//
// ⚠️ Seguridad: esto es login por correo como único factor (quien conozca el
// correo de un vecino aprobado podría entrar como él). Es una relajación
// deliberada y temporal (ver ACCESO_DIRECTO en el cliente). Para volver al
// bloqueo por código: poner ACCESO_DIRECTO=false en el cliente (esta función
// puede quedarse desplegada, deja de llamarse).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const { email } = await req.json()
    const emailT = String(email ?? '').trim().toLowerCase()
    if (!/.+@.+\..+/.test(emailT)) return json({ error: 'correo_invalido' }, 200)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Solo vecinos APROBADOS y activos.
    const { data: perfil } = await admin.from('profiles')
      .select('id, estado').eq('email', emailT).maybeSingle()
    if (!perfil) return json({ error: 'no_aprobado' }, 200)
    if (perfil.estado !== 'activo') return json({ error: 'no_activo' }, 200)

    // Genera un token de magic link (NO envía correo) y lo canjea por una sesión.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink', email: emailT,
    })
    const tokenHash = link?.properties?.hashed_token
    if (linkErr || !tokenHash) return json({ error: 'no_sesion' }, 200)

    const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
    const { data: v, error: vErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (vErr || !v?.session) return json({ error: 'no_sesion' }, 200)

    return json({
      ok: true,
      access_token: v.session.access_token,
      refresh_token: v.session.refresh_token,
    })
  } catch (_e) {
    return json({ error: 'error' }, 500)
  }
})
