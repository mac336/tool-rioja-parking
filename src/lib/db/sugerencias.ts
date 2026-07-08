// Sugerencias sobre la app — implementación real (Supabase Edge Function).
// El envío del correo lo hace el servidor (SMTP), no el cliente. Firma idéntica
// al mock (src/lib/apiMock.ts).
import { supabase } from '@/lib/supabase'

export async function enviarSugerencia(texto: string): Promise<void> {
  const { error } = await supabase.functions.invoke('enviar-sugerencia', { body: { texto } })
  if (error) throw error
}
