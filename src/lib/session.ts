// Autenticación y sesión reales contra Supabase Auth mediante código de un solo
// uso (OTP de 6 dígitos por correo). Solo se usa cuando VITE_DATA_SOURCE=supabase;
// en modo mock la app usa un usuario de demo (ver store.ts). El perfil se lee de
// la tabla profiles.
import { supabase } from '@/lib/supabase'
import type { Profile, Role, UserStatus } from '@/types'
import { iniciales } from '@/lib/format'
import { cacheClear } from '@/lib/cache'

export type AuthStatus = 'loading' | 'anon' | 'pending' | 'active' | 'suspended'

// Acceso directo (solo correo, sin código) para vecinos aprobados. Desde v1.32
// el valor REAL es un flag EN VIVO en `app_config.acceso_directo` (Gestión →
// Configuración), que la app lee al arrancar (store.config). Esta constante es
// solo el valor por defecto/semilla; el interruptor lo cambia el app_admin.
export const ACCESO_DIRECTO_DEFAULT = true

/** Acceso directo (solo correo): pide una sesión al servidor para un vecino
 *  aprobado y la establece. No envía ningún correo. Devuelve `error` (código
 *  interno) o null si entró. */
export async function accesoDirecto(email: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('acceso-directo', {
    body: { email: email.trim().toLowerCase() },
  })
  if (error) return { error: 'error' }
  if (data?.error) return { error: data.error as string }
  if (!data?.access_token || !data?.refresh_token) return { error: 'no_sesion' }
  const { error: setErr } = await supabase.auth.setSession({
    access_token: data.access_token, refresh_token: data.refresh_token,
  })
  if (setErr) return { error: 'no_sesion' }
  return { error: null }
}

/** Envía un código de 6 dígitos (OTP) por correo. Solo a usuarios ya aprobados
 *  (shouldCreateUser:false → un correo no dado de alta no crea cuenta). */
export async function enviarCodigo(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
}

/** Verifica el código de 6 dígitos e inicia la sesión. */
export async function verificarCodigo(email: string, token: string) {
  return supabase.auth.verifyOtp({ email, token, type: 'email' })
}

export async function signOut() {
  cacheClear() // no dejar datos cacheados de un usuario para el siguiente
  await supabase.auth.signOut()
}

/** Carga el profile del usuario autenticado (o null si no hay sesión). */
export async function loadProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!data) {
    // Autenticado pero sin fila de profile todavía → tratar como pendiente.
    return {
      id: user.id, email: user.email ?? '', nombre: user.email?.split('@')[0] ?? 'Vecino',
      vivienda: '', rol: 'vecino' as Role, estado: 'pendiente' as UserStatus,
      normas_aceptadas_at: null, iniciales: 'V',
    }
  }
  return { ...data, iniciales: iniciales(data.nombre) } as Profile
}

/** Deriva el estado de acceso a partir del profile. */
export function statusFromProfile(p: Profile | null): AuthStatus {
  if (!p) return 'anon'
  // Suspendido (temporal) y baja (definitiva) bloquean el acceso por igual.
  if (p.estado === 'suspendido' || p.estado === 'baja') return 'suspended'
  if (p.estado !== 'activo') return 'pending'
  return 'active'
}

/** Marca las normas como aceptadas (primer acceso). */
export async function aceptarNormas(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ normas_aceptadas_at: new Date().toISOString() }).eq('id', user.id)
}

/** Suscribe a cambios de sesión (login/logout/refresh). Devuelve unsubscribe. */
export function onAuthChange(cb: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => cb())
  return () => data.subscription.unsubscribe()
}
