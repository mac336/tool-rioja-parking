import { NavLink } from 'react-router-dom'
import { Home, Megaphone, CalendarDays, SquareParking, Menu } from 'lucide-react'
import { cx } from '@/components/ui'

const tabs = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/mensajes', label: 'Mensajes', Icon: Megaphone },
  { to: '/reservas', label: 'Reservas', Icon: CalendarDays },
  { to: '/parking', label: 'Parking Exterior', Icon: SquareParking },
  { to: '/mas', label: 'Más', Icon: Menu },
]

export function TabBar() {
  return (
    <nav className="z-20 flex h-[78px] shrink-0 items-stretch border-t border-border bg-surface safe-bottom md:hidden"
      aria-label="Navegación principal">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => cx('flex flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 text-[11px] font-medium',
            isActive ? 'text-primary font-bold' : 'text-faint')}>
          <Icon size={24} strokeWidth={1.9} />
          <span className="text-center leading-[1.05]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
