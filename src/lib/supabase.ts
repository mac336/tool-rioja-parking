import { createClient } from '@supabase/supabase-js'

// Cliente del navegador: SOLO la clave pública (anon). La seguridad depende de
// RLS, no de ocultar esta clave (specs/02, specs/11).
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url ?? '', anon ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** true si la app está configurada para usar el backend real. */
export const usingSupabase = import.meta.env.VITE_DATA_SOURCE === 'supabase' && !!url && !!anon
