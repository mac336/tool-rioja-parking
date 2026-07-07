// @vitest-environment node
// Integración de las EDGE FUNCTIONS reales (requiere `supabase functions serve`).
// Flujo de onboarding: solicitar-acceso → aprobar-solicitud (crea usuario+perfil
// activo) → gestionar-usuario (rol/suspender). Se salta si no hay entorno.
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const URL = 'http://127.0.0.1:54321'
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

const PRES_EMAIL = 'itest.edgepres@test.local'
const ONBOARD_EMAIL = 'itest.onboard@test.local'
const PASS = 'test-password-123'

async function delUserByEmail(email: string) {
  const { data: prof } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (prof) await admin.auth.admin.deleteUser(prof.id).catch(() => {})
}

beforeAll(async () => {
  // Presidente activo para autorizar las funciones.
  await admin.auth.admin.createUser({ email: PRES_EMAIL, password: PASS, email_confirm: true }).catch(() => {})
  const { data: p } = await admin.from('profiles').select('id').eq('email', PRES_EMAIL).maybeSingle()
  if (p) await admin.auth.admin.updateUserById(p.id, { password: PASS, email_confirm: true })
  await admin.from('profiles').update({ vivienda: '3º E Dcha', rol: 'presidente', estado: 'activo', normas_aceptadas_at: new Date().toISOString() }).eq('email', PRES_EMAIL)
  // Limpia onboarding previo.
  await admin.from('access_requests').delete().eq('email', ONBOARD_EMAIL)
  await delUserByEmail(ONBOARD_EMAIL)
})

describe.skipIf(!process.env.SUPA_ITEST)('Edge Functions (onboarding real)', () => {
  it('solicitar-acceso crea la solicitud (público)', async () => {
    await supabase.auth.signOut()
    const { error } = await supabase.functions.invoke('solicitar-acceso', {
      body: { nombre: 'Nuevo Vecino', email: ONBOARD_EMAIL, vivienda: 'Bajo F', comentario: 'itest' },
    })
    expect(error).toBeNull()
    const { data } = await admin.from('access_requests').select('*').eq('email', ONBOARD_EMAIL).eq('estado', 'pendiente')
    expect((data ?? []).length).toBe(1)
  })

  it('aprobar-solicitud crea el usuario y su perfil activo', async () => {
    await supabase.auth.signInWithPassword({ email: PRES_EMAIL, password: PASS })
    const { data: req } = await admin.from('access_requests').select('id').eq('email', ONBOARD_EMAIL).single()
    const { error } = await supabase.functions.invoke('aprobar-solicitud', {
      body: { requestId: req!.id, vivienda: 'Bajo F', rol: 'vecino' },
    })
    expect(error).toBeNull()
    const { data: prof } = await admin.from('profiles').select('estado, vivienda, rol').eq('email', ONBOARD_EMAIL).maybeSingle()
    expect(prof?.estado).toBe('activo')
    expect(prof?.vivienda).toBe('Bajo F')
  })

  it('gestionar-usuario cambia rol y suspende (solo gestión)', async () => {
    await supabase.auth.signInWithPassword({ email: PRES_EMAIL, password: PASS })
    const { data: prof } = await admin.from('profiles').select('id').eq('email', ONBOARD_EMAIL).single()
    const uid = prof!.id
    const r1 = await supabase.functions.invoke('gestionar-usuario', { body: { accion: 'rol', userId: uid, rol: 'junta' } })
    expect(r1.error).toBeNull()
    const { data: a } = await admin.from('profiles').select('rol').eq('id', uid).single()
    expect(a!.rol).toBe('junta')
    const r2 = await supabase.functions.invoke('gestionar-usuario', { body: { accion: 'suspender', userId: uid } })
    expect(r2.error).toBeNull()
    const { data: b } = await admin.from('profiles').select('estado').eq('id', uid).single()
    expect(b!.estado).toBe('suspendido')
  })
})
