import { NavLink } from 'react-router-dom'
import { Home, Menu } from 'lucide-react'
import { cx } from '@/components/ui'
import { resetViewport } from '@/lib/viewport'

// La Home es el centro de la app (panel de gadgets con todos los servicios),
// así que el footer solo necesita dos accesos: Inicio y Más.
const tabs = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/mas', label: 'Más', Icon: Menu, end: false },
]

export function TabBar() {
  return (
    <nav className="z-20 flex h-[78px] shrink-0 items-stretch border-t border-border bg-surface safe-bottom md:hidden"
      aria-label="Navegación principal">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={resetViewport}
          className={({ isActive }) => cx('flex flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 text-[11px] font-medium',
            isActive ? 'text-primary font-bold' : 'text-faint')}>
          <Icon size={24} strokeWidth={1.9} />
          <span className="text-center leading-[1.05]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
