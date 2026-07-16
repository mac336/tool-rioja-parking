// Auto-actualización de la PWA sin que el usuario tenga que cerrar la app.
// ---------------------------------------------------------------------------
// La app está en modo `prompt` (vite.config): cuando hay una versión nueva, el
// nuevo service worker queda EN ESPERA (no se activa solo). Aquí controlamos
// cuándo aplicarlo para poder enseñar la pantalla "Instalando actualización…".
//
// Flujo: al pulsar Inicio o al volver la app a primer plano → comprobamos si hay
// versión nueva (`comprobar`). Si el SW nuevo queda en espera, avisamos a los
// suscriptores (`onDisponible`), enseñamos la pantalla y llamamos a `aplicar()`,
// que activa el SW nuevo (skipWaiting) y RECARGA la app con la versión nueva.
import { registerSW } from 'virtual:pwa-register'

let aplicarSW: ((recargar?: boolean) => Promise<void>) | undefined
let registro: ServiceWorkerRegistration | undefined
let disponible = false
const suscriptores = new Set<() => void>()

/** Registra el SW (llamar una vez al arrancar). No hace nada en desarrollo. */
export function initPwaUpdate(): void {
  if (import.meta.env.DEV) return
  aplicarSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Hay una versión nueva esperando.
      disponible = true
      suscriptores.forEach((cb) => cb())
    },
    onRegisteredSW(_url, r) {
      registro = r
    },
  })
}

/** ¿Hay una actualización lista para aplicar? */
export function hayActualizacion(): boolean {
  return disponible
}

/** Suscribirse a "hay actualización lista". Devuelve la función para desuscribir. */
export function onActualizacionDisponible(cb: () => void): () => void {
  suscriptores.add(cb)
  return () => suscriptores.delete(cb)
}

/** Pregunta al servidor si hay una versión nueva (dispara onNeedRefresh si la hay). */
export async function comprobarActualizacion(): Promise<void> {
  try {
    await registro?.update()
  } catch {
    /* sin red o sin SW: no pasa nada, se reintentará al próximo toque */
  }
}

/** Aplica la actualización: activa el SW nuevo y recarga la app con la versión nueva. */
export async function aplicarActualizacion(): Promise<void> {
  if (aplicarSW) await aplicarSW(true)
  else window.location.reload()
}
