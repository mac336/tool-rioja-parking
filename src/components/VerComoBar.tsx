import { Eye, RotateCcw } from 'lucide-react'
import { useApp } from '@/store'
import { ROLE_LABEL } from '@/lib/roles'

/** Barra fija (encima del TabBar) visible solo cuando el app_admin está usando
 *  "Ver como": recuerda que la vista es simulada y permite volver a su rol. */
export function VerComoBar() {
  const { user, rolReal, salirVerComo } = useApp()
  if (!rolReal) return null
  return (
    <div className="z-30 flex shrink-0 items-center gap-2 border-t border-amber-400/40 bg-amber-100 px-3 py-2 text-amber-900">
      <Eye size={17} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
        Viendo como <b>{ROLE_LABEL[user.rol]}</b>
      </span>
      <button onClick={() => void salirVerComo()}
        className="flex shrink-0 items-center gap-1.5 rounded-pill bg-amber-900 px-3 py-1.5 text-[12.5px] font-bold text-amber-50">
        <RotateCcw size={14} /> Volver a administrador
      </button>
    </div>
  )
}
