import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Menu, ShieldCheck } from 'lucide-react'
import { cx } from '@/components/ui'
import { resetViewport } from '@/lib/viewport'
import { comprobarActualizacion } from '@/lib/pwaUpdate'
import { contarSolicitudesPendientes } from '@/lib/api'
import { cachedCall, TTL } from '@/lib/cache'
import { puedeAdmin, puedeAprobarAltas } from '@/lib/roles'
import { useApp } from '@/store'

// La Home es el centro de la app (panel de gadgets con todos los servicios),
// así que el footer solo necesita Inicio y Más. Para la gestión, se intercala
// "Gestión" en MEDIO (solo si el rol tiene panel).
const INICIO = { to: '/', label: 'Inicio', Icon: Home, end: true }
const GESTION = { to: '/admin', label: 'Gestión', Icon: ShieldCheck, end: false }
const MAS = { to: '/mas', label: 'Más', Icon: Menu, end: false }

export function TabBar() {
  const { user } = useApp()
  const loc = useLocation()
  const tabs = puedeAdmin(user.rol) ? [INICIO, GESTION, MAS] : [INICIO, MAS]

  // Badge de la pestaña Gestión = solicitudes de acceso pendientes (para quien
  // puede aprobar altas). Se refresca al navegar, para que se ponga al día tras
  // aprobar/rechazar sin recargar la app.
  const [pendientes, setPendientes] = useState(0)
  useEffect(() => {
    if (!puedeAprobarAltas(user.rol)) return
    let vivo = true
    cachedCall('solicitudes', TTL.solicitudes, contarSolicitudesPendientes)
      .then((n) => { if (vivo) setPendientes(n) }).catch(() => undefined)
    return () => { vivo = false }
  }, [user.rol, loc.pathname])

  return (
    <nav className="z-20 flex h-[78px] shrink-0 items-stretch border-t border-border bg-surface safe-bottom md:hidden"
      aria-label="Navegación principal">
      {tabs.map(({ to, label, Icon, end }) => {
        const badge = to === '/admin' && pendientes > 0
        return (
          <NavLink key={to} to={to} end={end}
            onClick={() => { resetViewport(); if (to === '/') void comprobarActualizacion() }}
            aria-label={badge ? `${label} (${pendientes} pendientes)` : label}
            className={({ isActive }) => cx('flex flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 text-[11px] font-medium',
              isActive ? 'text-primary font-bold' : 'text-faint')}>
            <span className="relative">
              <Icon size={24} strokeWidth={1.9} />
              {badge && (
                <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-extrabold leading-none text-white">
                  {pendientes > 9 ? '9+' : pendientes}
                </span>
              )}
            </span>
            <span className="text-center leading-[1.05]">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
