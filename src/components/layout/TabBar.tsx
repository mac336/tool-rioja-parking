import { NavLink } from 'react-router-dom'
import { Home, Menu, ShieldCheck } from 'lucide-react'
import { cx } from '@/components/ui'
import { resetViewport } from '@/lib/viewport'
import { comprobarActualizacion } from '@/lib/pwaUpdate'
import { puedeAdmin } from '@/lib/roles'
import { useApp } from '@/store'

// La Home es el centro de la app (panel de gadgets con todos los servicios),
// así que el footer solo necesita Inicio y Más. Para la gestión, se intercala
// "Gestión" en MEDIO (solo si el rol tiene panel).
const INICIO = { to: '/', label: 'Inicio', Icon: Home, end: true }
const GESTION = { to: '/admin', label: 'Gestión', Icon: ShieldCheck, end: false }
const MAS = { to: '/mas', label: 'Más', Icon: Menu, end: false }

export function TabBar() {
  const { user } = useApp()
  const tabs = puedeAdmin(user.rol) ? [INICIO, GESTION, MAS] : [INICIO, MAS]

  return (
    <nav className="z-20 flex h-[78px] shrink-0 items-stretch border-t border-border bg-surface safe-bottom md:hidden"
      aria-label="Navegación principal">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          onClick={() => { resetViewport(); if (to === '/') void comprobarActualizacion() }}
          className={({ isActive }) => cx('flex flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 text-[11px] font-medium',
            isActive ? 'text-primary font-bold' : 'text-faint')}>
          <Icon size={24} strokeWidth={1.9} />
          <span className="text-center leading-[1.05]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
