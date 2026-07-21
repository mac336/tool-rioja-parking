// Sincronización de la app con el viewport VISIBLE (VisualViewport).
// iOS, al abrir el teclado, encoge Y DESPLAZA el viewport visible; la app
// (fijada con .app-viewport) le sigue en altura (--app-h) y desplazamiento
// (--vv-top). Ver specs/10 y global.css (.app-viewport).

/** Re-sincroniza --app-h/--vv-top y recoloca el documento si quedó scroll
 *  residual. Se llama en cada cambio del VisualViewport y también al pulsar
 *  cualquier pestaña del menú (red de seguridad: si algo quedó descuadrado,
 *  tocar Inicio lo recompone). */
export function syncViewport() {
  const vv = window.visualViewport
  const h = vv ? vv.height : window.innerHeight
  const top = vv ? vv.offsetTop : 0
  const root = document.documentElement
  root.style.setProperty('--app-h', `${Math.round(h)}px`)
  root.style.setProperty('--vv-top', `${Math.round(top)}px`)
  if (!top && window.scrollY !== 0) window.scrollTo(0, 0)
}

/** Cierra el teclado (si hay un input con foco) y re-sincroniza el viewport.
 *  Pensado para la navegación del TabBar. */
export function resetViewport() {
  const el = document.activeElement
  if (el instanceof HTMLElement && el !== document.body) el.blur()
  // Doble pasada: ahora y tras el cierre del teclado (iOS lo anima).
  syncViewport()
  setTimeout(syncViewport, 350)
}

/** Re-sincroniza ahora y tras un instante (iOS asienta la altura un tick después
 *  de volver a primer plano / abrir desde una notificación). */
function resyncTardio() {
  syncViewport()
  requestAnimationFrame(syncViewport)
  setTimeout(syncViewport, 250)
  setTimeout(syncViewport, 600)
}

/** Instala los listeners (una vez, al arrancar la app). */
export function installViewportSync() {
  syncViewport()
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
  window.addEventListener('resize', syncViewport)
  window.addEventListener('orientationchange', syncViewport)
  // Al VOLVER a primer plano (abrir desde notificación, cambiar de app, bfcache):
  // iOS puede haber reportado mal la altura; recalcular arregla el "encogido".
  window.addEventListener('pageshow', resyncTardio)
  window.addEventListener('focus', resyncTardio)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resyncTardio()
  })
}
