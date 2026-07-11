// Sugerencias sobre la app — implementación real (Supabase Edge Function).
// El envío del correo lo hace el servidor (SMTP), no el cliente. Firma idéntica
// al mock (src/lib/apiMock.ts).
import { supabase } from '@/lib/supabase'

export async function enviarSugerencia(texto: string): Promise<void> {
  const { error } = await supabase.functions.invoke('enviar-sugerencia', { body: { texto } })
  if (error) throw error
}

export interface Sugerencia { id: string; nombre: string; vivienda: string | null; texto: string; created_at: string }

/** Lista de sugerencias recibidas (RLS: solo app_admin). Más nuevas primero. */
export async function listSugerencias(): Promise<Sugerencia[]> {
  const { data, error } = await supabase.from('sugerencias')
    .select('id, nombre, vivienda, texto, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Sugerencia[]
}
