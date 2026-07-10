import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SplashScreen } from '@/components/SplashScreen'
import './lib/pwa' // captura temprana del evento de instalación (beforeinstallprompt)
import './styles/global.css'

// Ajusta la altura de la app al viewport VISIBLE (VisualViewport). Al abrir el
// teclado en iOS, la app se encoge a la zona visible en vez de que el navegador
// desplace toda la ventana (cabecera incluida). Así solo scrollea el contenido.
function syncAppHeight() {
  const vv = window.visualViewport
  const h = vv ? vv.height : window.innerHeight
  document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`)
}
if (typeof window !== 'undefined') {
  syncAppHeight()
  window.visualViewport?.addEventListener('resize', syncAppHeight)
  window.visualViewport?.addEventListener('scroll', syncAppHeight)
  window.addEventListener('resize', syncAppHeight)
  window.addEventListener('orientationchange', syncAppHeight)
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
