// Perfil — implementación real (Supabase). Solo el nombre es editable por el
// usuario (RLS/grant de columna); vivienda/rol/estado los gestiona la aprobación.
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import { iniciales } from '@/lib/format'

export async function actualizarNombre(nombre: string): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('profiles')
    .update({ nombre }).eq('id', user.id).select('*').single()
  if (error) throw error
  return { ...data, iniciales: iniciales(data.nombre) } as Profile
}
