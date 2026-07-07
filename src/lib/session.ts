// Autenticación y sesión reales contra Supabase Auth (Google OAuth + enlace
// mágico). Solo se usa cuando VITE_DATA_SOURCE=supabase; en modo mock la app
// usa un usuario de demo (ver store.ts). El perfil se lee de la tabla profiles.
import { supabase } from '@/lib/supabase'
import type { Profile, Role, UserStatus } from '@/types'
import { iniciales } from '@/lib/format'

export type AuthStatus = 'loading' | 'anon' | 'pending' | 'active' | 'suspended'

/** Login con enlace mágico (OTP por correo). El correo debe estar aprobado. */
export async function signInMagic(email: string, redirectTo = window.location.origin) {
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
}

/** Login con Google (requiere el proveedor configurado en Supabase). */
export async function signInGoogle(redirectTo = window.location.origin) {
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
}

export async function signOut() {
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
  if (p.estado === 'suspendido') return 'suspended'
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
