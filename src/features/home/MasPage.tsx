import { Link } from 'react-router-dom'
import { Megaphone, MessageSquare, SquareCheckBig, Phone, Leaf, Lightbulb, Shield, FileText, Settings, ChevronRight, LayoutDashboard, Eye } from 'lucide-react'
import { useApp } from '@/store'
import { RoleBadge } from '@/components/ui'
import { roleBadgeKind, ROLE_LABEL, puedeAdmin, esAppAdmin } from '@/lib/roles'
import type { Role } from '@/types'
import { iniciales } from '@/lib/format'
import { usingSupabase } from '@/lib/supabase'

const links = [
  { to: '/mensajes', label: 'Mensajes de la comunidad', Icon: Megaphone },
  { to: '/buzon', label: 'Contactar con administración', Icon: MessageSquare },
  { to: '/votaciones', label: 'Votaciones', Icon: SquareCheckBig },
  { to: '/contactos', label: 'Contactos', Icon: Phone },
  { to: '/reciclaje', label: 'Reciclaje', Icon: Leaf },
  { to: '/sugerencias', label: 'Sugerencias sobre la app', Icon: Lightbulb },
  { to: '/normas', label: 'Normas de uso', Icon: FileText },
]

const ROLES_VER: Role[] = ['vecino', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'tester']

export function MasPage() {
  const { user, setRole, verComo } = useApp()
  return (
    <div className="px-4 py-5">
      {/* Perfil → abre Perfil y ajustes */}
      <Link to="/ajustes" className="mb-5 flex items-center gap-3 rounded-[18px] bg-surface p-4 shadow-neu">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-[16px] font-bold text-primary-700">{iniciales(user.nombre)}</span>
        <div className="flex-1">
          <div className="font-semibold text-ink">{user.nombre}</div>
          <div className="text-[13px] text-muted">{user.vivienda || 'Sin vivienda'} · {ROLE_LABEL[user.rol]}</div>
        </div>
        <RoleBadge kind={roleBadgeKind(user.rol)} />
      </Link>

      <nav className="flex flex-col overflow-hidden rounded-[18px] bg-surface shadow-neu">
        <Link to="/ajustes" className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-[15px] font-semibold text-ink">
          <Settings size={20} className="text-muted" /> Perfil y ajustes
          <ChevronRight size={18} className="ml-auto text-faint" />
        </Link>
        {puedeAdmin(user.rol) && (
          <Link to="/admin" className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-[15px] font-semibold text-primary-700">
            <Shield size={20} /> Panel de gestión
          </Link>
        )}
        {esAppAdmin(user.rol) && (
          <Link to="/dashboard" className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-[15px] font-semibold text-primary-700">
            <LayoutDashboard size={20} /> Dashboard de la app
          </Link>
        )}
        {links.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 border-b border-border px-4 py-3.5 text-[15px] text-ink last:border-0">
            <Icon size={20} className="text-muted" /> {label}
          </Link>
        ))}
      </nav>

      {/* Ver como: el app_admin previsualiza la app con otro rol (solo interfaz). */}
      {esAppAdmin(user.rol) && (
        <div className="mt-4 rounded-[18px] bg-surface p-4 shadow-neu">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-primary" />
            <span className="section-title">Ver la app como…</span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">Previsualiza lo que ve cada rol. Podrás volver a administrador desde la barra inferior.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ROLES_VER.map((r) => (
              <button key={r} onClick={() => void verComo(r)}
                className="rounded-pill bg-surface-2 px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-primary-soft hover:text-primary-700">
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Demo: cambiar rol para ver las vistas de gestión (solo modo demo, sin login real) */}
      {!usingSupabase && (
      <div className="mt-4 rounded-[18px] bg-surface-2 p-3 shadow-neu-inset">
        <div className="mb-2 text-[12px] font-bold text-faint">DEMO · ver como rol</div>
        <div className="flex flex-wrap gap-2">
          {(['vecino', 'junta', 'presidente', 'app_admin'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-shadow ${user.rol === r ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted shadow-neu-sm'}`}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
