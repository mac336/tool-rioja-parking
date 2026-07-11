import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X, Smartphone, ArrowDown, Compass, MoreHorizontal } from 'lucide-react'
import { Button, cx } from '@/components/ui'
import { getDeferredPrompt, clearDeferredPrompt, isStandalone, getPlataforma, esSafariIOS } from '@/lib/pwa'

const DISMISS_KEY = 'r25-install-dismissed'

/** Aviso para añadir la app a la pantalla de inicio.
 *  - Android/Chrome: botón que lanza el instalador nativo (automatismo).
 *  - iPhone (Safari): guía animada con flecha al botón Compartir (Apple no permite
 *    instalar con un botón; solo se puede guiar).
 *  - iPhone (otro navegador): invita a abrir en Safari. */
export function InstallPrompt() {
  const [plataforma] = useState(getPlataforma)
  const [safariIOS] = useState(esSafariIOS)
  const [installable, setInstallable] = useState<boolean>(() => !!getDeferredPrompt())
  const [visible, setVisible] = useState(false)
  const [guiaIOS, setGuiaIOS] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return
    const onInstallable = () => setInstallable(true)
    const onInstalled = () => setVisible(false)
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed', onInstalled)
    const t = setTimeout(() => setVisible(true), 1500)
    return () => {
      clearTimeout(t)
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const cerrar = () => { localStorage.setItem(DISMISS_KEY, '1'); setVisible(false); setGuiaIOS(false) }

  const instalarAndroid = async () => {
    const dp = getDeferredPrompt()
    if (!dp) return
    await dp.prompt()
    await dp.userChoice.catch(() => undefined)
    clearDeferredPrompt()
    cerrar()
  }

  if (isStandalone()) return null
  const puedeMostrar = plataforma === 'ios' || installable
  if (!visible || !puedeMostrar) return null

  // Guía animada de iPhone a pantalla completa.
  if (guiaIOS) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={cerrar}>
        <div className="mx-auto mb-2 w-full max-w-[520px] px-4" onClick={(e) => e.stopPropagation()}>
          <div className="rounded-[22px] border border-border bg-surface p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-extrabold text-ink">Añádela en 3 pasos</h3>
              <button onClick={cerrar} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <ol className="flex flex-col gap-3">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">1</span>
                <span className="text-[14px] text-ink">Pulsa los <b>tres puntos</b> <MoreHorizontal size={16} className="inline rounded-[5px] bg-surface-2 align-text-bottom text-primary" /> abajo a la derecha de Safari.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">2</span>
                <span className="text-[14px] text-ink">Pulsa <b>Compartir</b> <Share size={16} className="inline align-text-bottom text-primary" />.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">3</span>
                <span className="text-[14px] text-ink"><b>Baja en la lista</b> hasta <b>“Añadir a pantalla de inicio”</b> <SquarePlus size={16} className="inline align-text-bottom text-primary" /> y confirma con <b>Añadir</b>.</span>
              </li>
            </ol>
          </div>
        </div>
        {/* Flecha animada apuntando al botón ⋯ (abajo a la DERECHA en Safari) */}
        <div className="mb-1 flex flex-col items-end gap-1 pb-[env(safe-area-inset-bottom)] pr-7 text-white">
          <div className="flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-bold shadow-primary">
            <MoreHorizontal size={16} /> Pulsa aquí: los tres puntos
          </div>
          <ArrowDown size={30} className="mr-8 animate-bounce drop-shadow" />
        </div>
      </div>
    )
  }

  // iPhone pero NO Safari → no se puede añadir; invita a abrir en Safari.
  const iosNoSafari = plataforma === 'ios' && !safariIOS

  return (
    <div className="fixed inset-x-0 bottom-[86px] z-40 px-4 md:bottom-5">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 rounded-[18px] border border-border bg-surface p-4 shadow-neu">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary-700">
            <Smartphone size={22} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-bold text-ink">Añade Rioja 25 a tu móvil</h3>
            <p className="mt-0.5 text-[13px] text-muted">Ábrela como una app y recibe <b>notificaciones</b> de tus reservas y avisos.</p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        {installable ? (
          <Button block onClick={instalarAndroid}>
            <Download size={18} /> Añadir a la pantalla de inicio
          </Button>
        ) : iosNoSafari ? (
          <div className="flex items-center gap-2 rounded-[14px] bg-surface-2 p-3 text-[13px] text-muted">
            <Compass size={18} className="shrink-0 text-primary" />
            Para instalarla, abre esta web en <b>Safari</b> y pulsa “Añadir a tu móvil”.
          </div>
        ) : (
          <Button variant="secondary" block onClick={() => setGuiaIOS(true)}>
            <Share size={18} /> Ver cómo añadirla (iPhone)
          </Button>
        )}
      </div>
    </div>
  )
}
