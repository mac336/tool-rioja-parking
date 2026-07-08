import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X, Smartphone } from 'lucide-react'
import { Button, cx } from '@/components/ui'
import { getDeferredPrompt, clearDeferredPrompt, isStandalone, getPlataforma } from '@/lib/pwa'

const DISMISS_KEY = 'r25-install-dismissed'

/** Aviso para añadir la app a la pantalla de inicio (iPhone/Android). */
export function InstallPrompt() {
  const [plataforma] = useState(getPlataforma)
  const [installable, setInstallable] = useState<boolean>(() => !!getDeferredPrompt())
  const [visible, setVisible] = useState(false)
  const [ayudaIOS, setAyudaIOS] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return
    const onInstallable = () => setInstallable(true)
    const onInstalled = () => setVisible(false)
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed', onInstalled)
    const t = setTimeout(() => setVisible(true), 1500) // deja respirar tras entrar
    return () => {
      clearTimeout(t)
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const cerrar = () => { localStorage.setItem(DISMISS_KEY, '1'); setVisible(false) }

  const instalarAndroid = async () => {
    const dp = getDeferredPrompt()
    if (!dp) return
    await dp.prompt()
    await dp.userChoice.catch(() => undefined)
    clearDeferredPrompt()
    cerrar()
  }

  if (isStandalone()) return null
  // Mostramos en iOS (instrucciones manuales) o cuando el navegador ofrece instalar.
  const puedeMostrar = plataforma === 'ios' || installable
  if (!visible || !puedeMostrar) return null

  return (
    <div className="fixed inset-x-0 bottom-[86px] z-40 px-4 md:bottom-5">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 rounded-[18px] border border-border bg-surface p-4 shadow-neu">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary-700">
            <Smartphone size={22} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-bold text-ink">Añade Rioja 25 a tu móvil</h3>
            <p className="mt-0.5 text-[13px] text-muted">Ábrela como una app y recibe <b>notificaciones</b> cuando aprueben tu reserva u otras novedades.</p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        {plataforma === 'ios' ? (
          <>
            <Button variant="secondary" block onClick={() => setAyudaIOS((v) => !v)}>
              <Share size={18} /> {ayudaIOS ? 'Ocultar instrucciones' : 'Cómo añadirla (iPhone)'}
            </Button>
            {ayudaIOS && (
              <ol className="flex flex-col gap-2 rounded-[14px] bg-surface-2 p-3 text-[13px] text-muted">
                <li className="flex items-center gap-2"><Share size={16} className="shrink-0 text-primary" /> 1. Pulsa el icono <b>Compartir</b> en la barra de Safari.</li>
                <li className="flex items-center gap-2"><SquarePlus size={16} className="shrink-0 text-primary" /> 2. Elige <b>“Añadir a pantalla de inicio”</b>.</li>
                <li className="flex items-center gap-2"><Smartphone size={16} className="shrink-0 text-primary" /> 3. Confirma con <b>Añadir</b>. ¡Listo!</li>
              </ol>
            )}
          </>
        ) : (
          <Button block onClick={instalarAndroid}>
            <Download size={18} /> Añadir a la pantalla de inicio
          </Button>
        )}
      </div>
    </div>
  )
}
