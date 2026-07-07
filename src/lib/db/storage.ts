// Storage real (Supabase): subida de adjuntos al bucket privado 'adjuntos' y
// generación de URLs firmadas de caducidad corta.
import { supabase } from '@/lib/supabase'

const BUCKET = 'adjuntos'
const seguro = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_')

/** Sube las fotos de una incidencia y registra las filas en incidencia_adjuntos. */
export async function subirAdjuntosIncidencia(incidenciaId: string, files: File[]): Promise<void> {
  if (!files.length) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  for (const f of files) {
    const path = `incidencias/${incidenciaId}/${crypto.randomUUID()}-${seguro(f.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type })
    if (error) throw error
    const { error: e2 } = await supabase.from('incidencia_adjuntos')
      .insert({ incidencia_id: incidenciaId, path, subido_por: user.id })
    if (e2) throw e2
  }
}

/** URL firmada (1 h) para mostrar un adjunto privado. '' si falla. */
export async function urlFirmada(path: string): Promise<string> {
  if (!path) return ''
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? ''
}
