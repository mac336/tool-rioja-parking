// Activación de notificaciones push en el navegador. La clave PÚBLICA VAPID es
// pública por diseño (va en el cliente); la privada vive solo en el servidor.
import { guardarSuscripcionPush, quitarSuscripcionPush } from '@/lib/api'
import { isStandalone, getPlataforma } from '@/lib/pwa'

const VAPID_PUBLIC = 'BHej_t9ZdNFFjJBwiwvBEVMo4OeGEYUScos4wuwjcpfAIc-jXAGKHBI4V8pguEHSUVInN0zY24hwkTo5DWKRlu4'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export type EstadoPush =
  | 'no-soportado'    // el navegador no soporta push
  | 'requiere-instalar' // iOS: hay que añadir la app a la pantalla de inicio primero
  | 'denegado'        // el usuario bloqueó el permiso
  | 'activas'         // suscrito
  | 'inactivas'       // soportado pero sin suscripción

const soporta = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export async function estadoPush(): Promise<EstadoPush> {
  if (!soporta()) {
    // En iOS, PushManager solo existe si la app está instalada (standalone).
    return getPlataforma() === 'ios' && !isStandalone() ? 'requiere-instalar' : 'no-soportado'
  }
  if (getPlataforma() === 'ios' && !isStandalone()) return 'requiere-instalar'
  if (Notification.permission === 'denied') return 'denegado'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'activas' : 'inactivas'
  } catch {
    return 'inactivas'
  }
}

/** Pide permiso y suscribe este dispositivo. Devuelve el nuevo estado. */
export async function activarNotificaciones(): Promise<EstadoPush> {
  if (!soporta()) return 'no-soportado'
  if (getPlataforma() === 'ios' && !isStandalone()) return 'requiere-instalar'
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return permiso === 'denied' ? 'denegado' : 'inactivas'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    })
  }
  await guardarSuscripcionPush(sub.toJSON(), navigator.userAgent)
  return 'activas'
}

/** Cancela la suscripción de este dispositivo. */
export async function desactivarNotificaciones(): Promise<EstadoPush> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await quitarSuscripcionPush(sub.endpoint).catch(() => undefined)
      await sub.unsubscribe()
    }
  } catch { /* noop */ }
  return 'inactivas'
}
