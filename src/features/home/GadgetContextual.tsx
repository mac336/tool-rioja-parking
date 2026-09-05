import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface GadgetContextualProps {
  to: string
  Icon: LucideIcon
  overline: ReactNode
  badge?: ReactNode
  gradient: string
  children: ReactNode
  iconSize?: number
}

// Markup ÚNICO de la "tarjeta contextual" de la Home (specs/21 § Recordatorio
// en la Home, refactor D1): parking, reserva y calendario comparten este
// componente para no divergir visualmente. Reproduce exactamente el markup y
// clases de las tarjetas que ya existían en HomePage.tsx (parking/reserva).
export function GadgetContextual({ to, Icon, overline, badge, gradient, children, iconSize = 26 }: GadgetContextualProps) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-[16px] px-4 py-[13px] text-white" style={{ background: gradient }}>
      <Icon size={iconSize} strokeWidth={1.9} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/65">
          {overline} {badge}
        </div>
        <div className="truncate text-[14.5px]">{children}</div>
      </div>
      <span className="text-[18px] opacity-70">›</span>
    </Link>
  )
}
