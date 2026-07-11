// Contador de avisos "no vistos" para la campana de la Home.
// La fecha de la última visita a /avisos se guarda EN EL PERFIL
// (`profiles.avisos_vistos_at`, migración 0028) → el contador es consistente
// entre dispositivos (web y PWA). El localStorage queda como respaldo para el
// modo demo (sin backend) y mientras el perfil no ha recargado.
import type { Aviso } from '@/lib/api'
import { supabase, usingSupabase } from '@/lib/supabase'

const KEY = 'r25-avisos-vistos'

/** Marca "todo visto": guarda la fecha en el perfil (BD) y en el dispositivo. */
export async function marcarAvisosVistos(): Promise<void> {
  const ahora = new Date().toISOString()
  try { localStorage.setItem(KEY, ahora) } catch { /* noop */ }
  if (usingSupabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ avisos_vistos_at: ahora }).eq('id', user.id)
    } catch { /* best-effort: queda el respaldo local */ }
  }
}

/** Nº de avisos posteriores a la última visita. `desdePerfil` viene del perfil
 *  del usuario (BD); si aún no existe, se usa el respaldo del dispositivo. */
export function contarAvisosNuevos(avisos: Aviso[], desdePerfil?: string | null): number {
  let desde = desdePerfil ?? ''
  if (!desde) {
    try { desde = localStorage.getItem(KEY) ?? '' } catch { /* noop */ }
  }
  if (!desde) return avisos.length
  return avisos.filter((a) => a.ts > desde).length
}
