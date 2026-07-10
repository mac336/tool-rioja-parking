import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SplashScreen } from '@/components/SplashScreen'
import './lib/pwa' // captura temprana del evento de instalación (beforeinstallprompt)
import './styles/global.css'

// Fija la app al viewport VISIBLE (VisualViewport): sincroniza su ALTURA
// (--app-h) y su DESPLAZAMIENTO (--vv-top). Al abrir el teclado, iOS no solo
// encoge el viewport visible: además lo DESPLAZA (offsetTop > 0) para acercar
// el input al teclado; si solo ajustamos la altura, la app fijada se queda
// arriba y la pantalla "se descuadra" (cabecera fuera, input tapado). Moviendo
// el contenedor con --vv-top, la app SIGUE al viewport visible y cabecera/pie
// quedan siempre a la vista (clase .app-viewport en global.css).
function syncViewport() {
  const vv = window.visualViewport
  const h = vv ? vv.height : window.innerHeight
  const top = vv ? vv.offsetTop : 0
  const root = document.documentElement
  root.style.setProperty('--app-h', `${Math.round(h)}px`)
  root.style.setProperty('--vv-top', `${Math.round(top)}px`)
  // Si el documento quedó con scroll residual (pan de iOS al cerrar el teclado),
  // se recoloca: el documento nunca debe scrollear (app-shell fijo).
  if (!top && window.scrollY !== 0) window.scrollTo(0, 0)
}
if (typeof window !== 'undefined') {
  syncViewport()
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
  window.addEventListener('resize', syncViewport)
  window.addEventListener('orientationchange', syncViewport)
}

function Root() {
  // Bienvenida una vez por apertura de la app (sesión de pestaña).
  const [splash, setSplash] = useState(() => {
    try { return !sessionStorage.getItem('r25-splash-seen') } catch { return true }
  })
  useEffect(() => {
    if (splash) { try { sessionStorage.setItem('r25-splash-seen', '1') } catch { /* noop */ } }
  }, [splash])

  return (
    <>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      <RouterProvider router={router} />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
