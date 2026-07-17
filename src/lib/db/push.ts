// Suscripciones push del usuario — implementación real (Supabase).
// El envío lo hace el servidor; aquí solo guardamos/quitamos la suscripción del
// dispositivo. Firmas idénticas al mock.
import { supabase } from '@/lib/supabase'

export async function guardarSuscripcionPush(sub: PushSubscriptionJSON, userAgent: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const keys = sub.keys ?? { p256dh: '', auth: '' }
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: userAgent,
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function quitarSuscripcionPush(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}

/** Diagnóstico: envía una push de PRUEBA a este usuario y devuelve el detalle
 *  del intento (Edge `probar-push`). Para saber por qué no llegan las push. */
export async function probarPush(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('probar-push', { body: {} })
  if (error) throw error
  return (data ?? {}) as Record<string, unknown>
}
