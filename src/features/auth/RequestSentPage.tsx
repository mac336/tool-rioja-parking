import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui'

export function RequestSentPage() {
  const { state } = useLocation() as { state?: { vivienda?: string } }
  const vivienda = state?.vivienda
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'linear-gradient(180deg,#DFF6EA,#F1F5F2)' }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 size={44} />
      </div>
      <h1 className="font-display text-[28px] font-extrabold text-ink">Solicitud enviada</h1>
      <p className="max-w-xs text-[15px] text-muted">
        La junta revisará tu acceso{vivienda ? ` para el ${vivienda}` : ''} y recibirás un correo para completar tu entrada.
      </p>
      <span className="rounded-pill bg-warn-soft px-3 py-1.5 text-[13px] font-bold text-[#8a5a0f]">● Pendiente de aprobación</span>
      <Link to="/login" className="mt-4 w-full max-w-xs"><Button variant="secondary" block>Volver a la entrada</Button></Link>
    </div>
  )
}
