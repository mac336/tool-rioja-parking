import { NavLink } from 'react-router-dom'
import { Home, TriangleAlert, SquareCheckBig, CalendarDays, SquareParking, Phone, Megaphone, Shield } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { RoleBadge } from '@/components/ui'
import { cx } from '@/components/ui'
import { useApp } from '@/store'
import { roleBadgeKind, puedeAdmin } from '@/lib/roles'
import { iniciales } from '@/lib/format'

const nav = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/anuncios', label: 'Anuncios', Icon: Megaphone },
  { to: '/incidencias', label: 'Incidencias', Icon: TriangleAlert },
  { to: '/votaciones', label: 'Votaciones', Icon: SquareCheckBig },
  { to: '/reservas', label: 'Reservas', Icon: CalendarDays },
  { to: '/parking', label: 'Parking', Icon: SquareParking },
  { to: '/contactos', label: 'Contactos', Icon: Phone },
]

export function Sidebar() {
  const { user } = useApp()
  return (
    <aside className="hidden w-[238px] shrink-0 flex-col justify-between p-4 text-white md:flex"
      style={{ background: 'linear-gradient(180deg,#0B7E52,#0E1714)' }}>
      <div>
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <Logo size={38} />
          <span className="font-display text-[19px] font-bold">Rioja 25</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-semibold transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10')}>
              <Icon size={20} strokeWidth={1.9} /> {label}
            </NavLink>
          ))}
          {puedeAdmin(user.rol) && (
            <NavLink to="/admin"
              className={({ isActive }) => cx('mt-2 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-semibold transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10')}>
              <Shield size={20} strokeWidth={1.9} /> Gestión
            </NavLink>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2.5 rounded-[12px] bg-white/10 p-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold">
          {iniciales(user.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{user.nombre}</div>
          <div className="text-[11px] text-white/60">{user.vivienda}</div>
        </div>
        <RoleBadge kind={roleBadgeKind(user.rol)} />
      </div>
    </aside>
  )
}
