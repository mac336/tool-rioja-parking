import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { Analytics } from '@vercel/analytics/react'
import { SplashScreen } from '@/components/SplashScreen'
import { AutoUpdater } from '@/components/AutoUpdater'
import './lib/pwa' // captura temprana del evento de instalación (beforeinstallprompt)
import { initPwaUpdate } from '@/lib/pwaUpdate'
import './styles/global.css'

import { installViewportSync } from '@/lib/viewport'

// Fija la app al viewport VISIBLE (altura --app-h + desplazamiento --vv-top).
// Ver src/lib/viewport.ts y la clase .app-viewport en global.css.
if (typeof window !== 'undefined') installViewportSync()

// Registra el service worker para la auto-actualización (ver src/lib/pwaUpdate.ts).
initPwaUpdate()

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
      <AutoUpdater />
      <Analytics />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
