import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { estadoPush, activarNotificaciones } from '@/lib/pushClient'
import { isStandalone, getPlataforma } from '@/lib/pwa'

// Aviso automático para activar notificaciones. Aparece al entrar a quien aún no
// las tiene activadas (incluidos los vecinos ya registrados). Si el usuario dice
// "Ahora no", se pospone unos días; siempre puede activarlas/desactivarlas en
// Ajustes. En iPhone solo tiene sentido con la app instalada (abierta desde el
// icono); si no, manda el InstallPrompt.
const SNOOZE_KEY = 'r25-push-nudge'
const SNOOZE_MS = 3 * 864e5 // 3 días

export function NotificationsPrompt() {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Solo en app instalada o en escritorio; en móvil-navegador manda InstallPrompt.
    const enApp = isStandalone() || getPlataforma() === 'other'
    if (!enApp) return
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    if (snooze && Date.now() - snooze < SNOOZE_MS) return
    let cancel = false
    estadoPush().then((e) => {
      if (!cancel && e === 'inactivas') setTimeout(() => setVisible(true), 1200)
    })
    return () => { cancel = true }
  }, [])

  const posponer = () => { localStorage.setItem(SNOOZE_KEY, String(Date.now())); setVisible(false) }

  const activar = async () => {
    setBusy(true)
    const e = await activarNotificaciones()
    setBusy(false)
    setVisible(false)
    // Si no quedó activo (permiso denegado, etc.), no insistir en unos días.
    if (e !== 'activas') localStorage.setItem(SNOOZE_KEY, String(Date.now()))
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-[86px] z-40 px-4 md:bottom-5">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 rounded-[18px] border border-border bg-surface p-4 shadow-neu">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary-700">
            <Bell size={22} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-bold text-ink">Activa las notificaciones</h3>
            <p className="mt-0.5 text-[13px] text-muted">Entérate al momento de <b>avisos, reservas y mensajes</b> de la comunidad. Puedes desactivarlas cuando quieras en Ajustes.</p>
          </div>
          <button onClick={posponer} aria-label="Ahora no" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <Button block disabled={busy} onClick={activar}><Bell size={18} /> {busy ? 'Activando…' : 'Activar notificaciones'}</Button>
          <Button variant="ghost" disabled={busy} onClick={posponer}>Ahora no</Button>
        </div>
      </div>
    </div>
  )
}
