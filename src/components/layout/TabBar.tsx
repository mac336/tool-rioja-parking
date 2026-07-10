import { NavLink } from 'react-router-dom'
import { Home, Megaphone, CalendarDays, SquareParking, Menu, ShieldCheck } from 'lucide-react'
import { cx } from '@/components/ui'
import { puedeAdmin } from '@/lib/roles'
import { useApp } from '@/store'

type Tab = { to: string; label: string; Icon: typeof Home; end?: boolean }
const INICIO: Tab = { to: '/', label: 'Inicio', Icon: Home, end: true }
const MENSAJES: Tab = { to: '/mensajes', label: 'Mensajes', Icon: Megaphone }
const RESERVAS: Tab = { to: '/reservas', label: 'Reservas', Icon: CalendarDays }
const PARKING: Tab = { to: '/parking', label: 'Parking Exterior', Icon: SquareParking }
const MAS: Tab = { to: '/mas', label: 'Más', Icon: Menu }
const GESTION: Tab = { to: '/admin', label: 'Gestión', Icon: ShieldCheck }

export function TabBar() {
  const { user } = useApp()
  // Para gestión (superadmin o rol con permiso de panel): "Gestión" entra a la
  // izquierda y empuja Mensajes a la derecha; se cede el sitio de Parking (que
  // sigue accesible desde "Más").
  const tabs = puedeAdmin(user.rol)
    ? [INICIO, GESTION, MENSAJES, RESERVAS, MAS]
    : [INICIO, MENSAJES, RESERVAS, PARKING, MAS]

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
