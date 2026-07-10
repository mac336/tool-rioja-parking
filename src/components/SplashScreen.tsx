import { useEffect, useState } from 'react'
import { ArrowRight, Share, SquarePlus, Download, Smartphone, Check, Compass } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { cx } from '@/components/ui'
import { ACCESO_DIRECTO } from '@/lib/session'
import { getDeferredPrompt, clearDeferredPrompt, isStandalone, getPlataforma, esSafariIOS } from '@/lib/pwa'

/** Pantalla de bienvenida al abrir la app. Dos pasos: (1) bienvenida y (2)
 *  invitación a INSTALAR la app en el móvil (para que no tengan que volver a
 *  identificarse cada vez que entran desde el navegador). Se mantiene hasta que
 *  el usuario avanza (no se quita sola). */
type Paso = 'bienvenida' | 'instalar'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [paso, setPaso] = useState<Paso>('bienvenida')
  const [plataforma] = useState(getPlataforma)
  const [safariIOS] = useState(esSafariIOS)
  const [instalable, setInstalable] = useState<boolean>(() => !!getDeferredPrompt())
  const [instalada, setInstalada] = useState(false)
  const yaInstalada = isStandalone()

  useEffect(() => {
    const a = requestAnimationFrame(() => setEntered(true))
    const onInstallable = () => setInstalable(true)
    const onInstalled = () => setInstalada(true)
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      cancelAnimationFrame(a)
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const salir = () => { setLeaving(true); setTimeout(onDone, 450) }

  // Paso 1 → si ya está instalada (abierta desde el icono) no tiene sentido el
  // paso de instalar: entra directo. Si no, va al paso de instalación.
  const siguiente = () => { if (yaInstalada) salir(); else setPaso('instalar') }

  const instalarAndroid = async () => {
    const dp = getDeferredPrompt()
    if (!dp) return
    await dp.prompt()
    await dp.userChoice.catch(() => undefined)
    clearDeferredPrompt()
    setInstalada(true)
  }

  return (
    <div
      className={cx('fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 text-center transition-opacity duration-500',
        leaving ? 'opacity-0' : 'opacity-100')}
      style={{ background: 'linear-gradient(160deg,var(--brand-from),var(--brand-to))' }}
    >
      <div className={cx('flex w-full max-w-sm flex-col items-center transition-all duration-500 ease-out',
        entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0')}>

        {paso === 'bienvenida' ? (
          <>
            <span className="flex items-center justify-center rounded-[26%] bg-white/95 p-3.5 shadow-2xl">
              <Logo size={84} />
            </span>
            <p className="mt-7 text-[13px] font-semibold uppercase tracking-[0.3em] text-white/75">Bienvenido a</p>
            <h1 className="mt-1.5 font-display text-[38px] font-extrabold leading-none text-white">tu comunidad</h1>
            <p className="mt-2 font-display text-[20px] font-bold text-white/90">Rioja 25</p>

            <p className="mt-6 text-[15px] leading-relaxed text-white/85">
              Un espacio pensado para estar al día de todo lo que pasa en tu urbanización:
              incidencias, reservas, votaciones y avisos, al alcance de tu mano.
            </p>

            {!ACCESO_DIRECTO && (
              <p className="mt-4 rounded-[14px] bg-white/10 px-4 py-2.5 text-[13px] leading-snug text-white/85">
                Para entrar recibirás un <b>código por correo</b>. Si no te llega,
                revisa tu carpeta de <b>spam</b> o correo no deseado.
              </p>
            )}

            <button type="button" onClick={siguiente}
              className="mt-7 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-pill bg-white px-8 text-[16px] font-extrabold text-primary-700 shadow-xl transition-transform active:scale-[0.98]">
              Siguiente <ArrowRight size={19} />
            </button>
          </>
        ) : (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/15 text-white">
              <Smartphone size={32} strokeWidth={1.9} />
            </span>
            <h1 className="mt-5 font-display text-[26px] font-extrabold leading-tight text-white">Instálala en tu móvil</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">
              Añádela a tu <b>pantalla de inicio</b> y ábrela como una app. Así <b>solo te identificas una vez</b>
              y entras con un toque, sin tener que volver a poner tu correo cada vez.
            </p>

            {instalada || yaInstalada ? (
              <div className="mt-6 flex items-center gap-2 rounded-[14px] bg-white/15 px-4 py-3 text-[14px] font-semibold text-white">
                <Check size={20} /> ¡Listo! Ya la tienes en tu móvil.
              </div>
            ) : instalable ? (
              // Android/Chrome: instalador nativo.
              <button type="button" onClick={instalarAndroid}
                className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-pill bg-white px-8 text-[16px] font-extrabold text-primary-700 shadow-xl transition-transform active:scale-[0.98]">
                <Download size={19} /> Añadir a mi pantalla de inicio
              </button>
            ) : plataforma === 'ios' && safariIOS ? (
              // iPhone (Safari): guía en 2 pasos (Apple no permite botón directo).
              <div className="mt-6 w-full rounded-[16px] bg-white/12 p-4 text-left">
                <div className="flex items-center gap-3 text-[14px] text-white">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-bold text-primary-700">1</span>
                  <span>Pulsa <b>Compartir</b> <Share size={16} className="inline align-text-bottom" /> en la barra de Safari.</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[14px] text-white">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-bold text-primary-700">2</span>
                  <span>Elige <b>“Añadir a pantalla de inicio”</b> <SquarePlus size={16} className="inline align-text-bottom" />.</span>
                </div>
              </div>
            ) : plataforma === 'ios' ? (
              // iPhone en otro navegador: hay que abrir en Safari.
              <div className="mt-6 flex items-center gap-2 rounded-[14px] bg-white/12 px-4 py-3 text-[13.5px] text-white/90">
                <Compass size={18} className="shrink-0" /> Para instalarla en iPhone, abre esta web en <b>Safari</b>.
              </div>
            ) : (
              <div className="mt-6 rounded-[14px] bg-white/12 px-4 py-3 text-[13.5px] text-white/90">
                En el móvil, usa el menú del navegador → <b>“Añadir a pantalla de inicio”</b>.
              </div>
            )}

            <button type="button" onClick={salir}
              className={cx('mt-4 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-pill px-8 text-[15px] font-bold transition-transform active:scale-[0.98]',
                (instalada || yaInstalada || instalable)
                  ? 'bg-white/15 text-white'
                  : 'bg-white text-primary-700 shadow-xl')}>
              {instalada || yaInstalada ? 'Entrar' : 'Continuar sin instalar'} <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 pb-[calc(env(safe-area-inset-bottom)+14px)] text-center">
        <p className="text-[12px] font-medium tracking-wide text-white/70">Designed and developed by mac336</p>
        <p className="mt-0.5 text-[10.5px] text-white/50">v{__APP_VERSION__}</p>
      </div>
    </div>
  )
}
