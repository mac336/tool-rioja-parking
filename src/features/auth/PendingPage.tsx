import { Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { useApp } from '@/store'
import { useNavigate } from 'react-router-dom'

export function PendingPage() {
  const { logout } = useApp()
  const nav = useNavigate()
  const salir = async () => { await logout(); nav('/login') }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: 'linear-gradient(180deg,var(--primary-soft),var(--bg))' }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warn-soft text-warn-ink"><Clock size={44} /></div>
      <h1 className="font-display text-[26px] font-extrabold text-ink">Cuenta pendiente</h1>
      <p className="max-w-xs text-[15px] text-muted">
        Has entrado correctamente, pero tu acceso aún no ha sido aprobado por la gestión.
        Recibirás un aviso cuando esté listo.
      </p>
      <p className="max-w-xs text-[13px] text-faint">¿Entraste con un correo distinto al que solicitaste? Cierra sesión y usa el correo aprobado.</p>
      <Button variant="secondary" onClick={salir}><LogOut size={18} /> Cerrar sesión</Button>
    </div>
  )
}
