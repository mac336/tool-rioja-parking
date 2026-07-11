// Sugerencias sobre la app — HISTÓRICO de solo lectura. El formulario de envío
// se retiró (el feedback al desarrollador va por el chat del buzón); esta tabla
// conserva lo recibido antes y lo lee el Dashboard del app_admin.
import { supabase } from '@/lib/supabase'

export interface Sugerencia { id: string; nombre: string; vivienda: string | null; texto: string; created_at: string }

/** Lista de sugerencias recibidas (RLS: solo app_admin). Más nuevas primero. */
export async function listSugerencias(): Promise<Sugerencia[]> {
  const { data, error } = await supabase.from('sugerencias')
    .select('id, nombre, vivienda, texto, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Sugerencia[]
}
