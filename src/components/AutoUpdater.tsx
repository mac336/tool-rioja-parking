import { useEffect, useState } from 'react'
import { Logo } from '@/components/Logo'
import { onActualizacionDisponible, aplicarActualizacion, comprobarActualizacion } from '@/lib/pwaUpdate'

// Orquesta la auto-actualización de la PWA:
//  · Escucha "hay versión nueva" (SW en espera) → enseña la pantalla de
//    "Instalando actualización…" y, tras un instante, recarga con la versión nueva.
//  · Comprueba si hay versión nueva cuando la app vuelve a PRIMER PLANO
//    (visibilitychange), que es justo cuando el usuario la reabre en segundo plano.
//    El toque en "Inicio" también la comprueba (ver TabBar → comprobarActualizacion).
export function AutoUpdater() {
  const [instalando, setInstalando] = useState(false)

  useEffect(() => {
    const quitar = onActualizacionDisponible(() => {
      setInstalando(true)
      // Deja ver la pantalla un instante y aplica (activa el SW nuevo + recarga).
      window.setTimeout(() => { void aplicarActualizacion() }, 1400)
    })
    const alVolver = () => { if (document.visibilityState === 'visible') void comprobarActualizacion() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { quitar(); document.removeEventListener('visibilitychange', alVolver) }
  }, [])

  if (!instalando) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(160deg,var(--brand-from),var(--brand-to))' }}
      role="alertdialog"
      aria-label="Instalando actualización"
    >
      <span className="flex items-center justify-center rounded-[26%] bg-white/95 p-3.5 shadow-2xl">
        <Logo size={72} />
      </span>
      <div className="mt-8 h-9 w-9 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
      <h1 className="mt-6 font-display text-[22px] font-extrabold text-white">Instalando actualización…</h1>
      <p className="mt-2 max-w-xs text-[14px] text-white/85">Estamos poniendo la app al día. Se reiniciará sola en un momento.</p>
    </div>
  )
}
