import { Link } from 'react-router-dom'
import { Megaphone, SquareCheckBig, Phone, Leaf, Lightbulb, Shield, Moon, Sun, FileText, LogOut } from 'lucide-react'
import { useApp } from '@/store'
import { RoleBadge } from '@/components/ui'
import { roleBadgeKind, ROLE_LABEL, puedeAdmin } from '@/lib/roles'
import { iniciales } from '@/lib/format'

const links = [
  { to: '/anuncios', label: 'Tablón de anuncios', Icon: Megaphone },
  { to: '/votaciones', label: 'Votaciones', Icon: SquareCheckBig },
  { to: '/contactos', label: 'Contactos', Icon: Phone },
  { to: '/reciclaje', label: 'Reciclaje', Icon: Leaf },
  { to: '/sugerencias', label: 'Sugerencias sobre la app', Icon: Lightbulb },
  { to: '/privacidad', label: 'Aviso de privacidad', Icon: FileText },
  { to: '/normas', label: 'Normas de uso', Icon: FileText },
]

export function MasPage() {
  const { user, theme, setTheme, setRole } = useApp()
  return (
    <div className="px-4 py-5">
      <div className="mb-5 flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-[16px] font-bold text-primary-700">{iniciales(user.nombre)}</span>
        <div className="flex-1">
          <div className="font-semibold text-ink">{user.nombre}</div>
          <div className="text-[13px] text-muted">{user.vivienda} · {ROLE_LABEL[user.rol]}</div>
        </div>
        <RoleBadge kind={roleBadgeKind(user.rol)} />
      </div>

      <nav className="flex flex-col overflow-hidden rounded-[16px] border border-border bg-surface">
        {puedeAdmin(user.rol) && (
          <Link to="/admin" className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-[15px] font-semibold text-primary-700">
            <Shield size={20} /> Panel de gestión
          </Link>
        )}
        {links.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-[15px] text-ink last:border-0">
            <Icon size={20} className="text-muted" /> {label}
          </Link>
        ))}
      </nav>

      {/* Tema */}
      <div className="mt-4 flex items-center gap-2 rounded-[16px] border border-border bg-surface p-3">
        <span className="flex-1 px-1 text-[14px] font-semibold text-ink">Apariencia</span>
        {([['system', 'Auto', Sun], ['light', 'Claro', Sun], ['dark', 'Oscuro', Moon]] as const).map(([val, lbl, Icon]) => (
          <button key={val} onClick={() => setTheme(val)}
            className={`flex items-center gap-1 rounded-pill px-3 py-1.5 text-[13px] font-semibold ${theme === val ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>
            <Icon size={14} /> {lbl}
          </button>
        ))}
      </div>

      {/* Demo: cambiar rol para ver las vistas de gestión (solo mientras no hay login real) */}
      <div className="mt-4 rounded-[16px] border border-dashed border-border-strong bg-surface-2 p-3">
        <div className="mb-2 text-[12px] font-bold text-faint">DEMO · ver como rol</div>
        <div className="flex flex-wrap gap-2">
          {(['vecino', 'junta', 'presidente', 'app_admin'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold ${user.rol === r ? 'bg-primary text-white' : 'bg-surface text-muted border border-border'}`}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <Link to="/login" className="mt-4 flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-danger">
        <LogOut size={18} /> Cerrar sesión
      </Link>
    </div>
  )
}
