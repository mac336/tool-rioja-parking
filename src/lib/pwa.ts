// Utilidades PWA: captura del evento de instalación (Android/Chrome) y detección
// de plataforma / modo instalado. El evento beforeinstallprompt puede dispararse
// antes de montar React, así que lo capturamos aquí (import con efecto en main).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    window.dispatchEvent(new Event('pwa-installable'))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    window.dispatchEvent(new Event('pwa-installed'))
  })
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferred
}
export function clearDeferredPrompt() {
  deferred = null
}

/** ¿La app ya se abre como instalada (pantalla de inicio)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export type Plataforma = 'ios' | 'android' | 'other'
export function getPlataforma(): Plataforma {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

/** En iOS, "Añadir a pantalla de inicio" solo existe en Safari (no en Chrome iOS,
 *  Firefox iOS, ni navegadores dentro de otras apps). */
export function esSafariIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua)
  const otroNavegador = /CriOS|FxiOS|EdgiOS|OPiOS|GSA|mercury/i.test(ua)
  return ios && !otroNavegador && /Safari/i.test(ua)
}
