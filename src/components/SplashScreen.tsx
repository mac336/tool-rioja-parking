import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { cx } from '@/components/ui'

/** Pantalla de bienvenida al abrir la app. Aparece con una animación y se
 *  mantiene hasta que el usuario pulsa "Siguiente" (no se quita sola). */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const a = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(a)
  }, [])

  const continuar = () => {
    setLeaving(true)
    setTimeout(onDone, 450) // deja terminar el fundido de salida
  }

  return (
    <div
      className={cx('fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 text-center transition-opacity duration-500',
        leaving ? 'opacity-0' : 'opacity-100')}
      style={{ background: 'linear-gradient(160deg,var(--brand-from),var(--brand-to))' }}
    >
      <div className={cx('flex flex-col items-center transition-all duration-700 ease-out',
        entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0')}>
        <span className="flex items-center justify-center rounded-[26%] bg-white/95 p-3.5 shadow-2xl">
          <Logo size={84} />
        </span>
        <p className="mt-7 text-[13px] font-semibold uppercase tracking-[0.3em] text-white/75">Bienvenido a</p>
        <h1 className="mt-1.5 font-display text-[38px] font-extrabold leading-none text-white">tu comunidad</h1>
        <p className="mt-2 font-display text-[20px] font-bold text-white/90">Rioja 25</p>

        <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/85">
          Un espacio pensado para estar al día de todo lo que pasa en tu urbanización:
          incidencias, reservas, votaciones y avisos, al alcance de tu mano.
        </p>

        <button
          type="button"
          onClick={continuar}
          className="mt-9 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-pill bg-white px-8 text-[16px] font-extrabold text-primary-700 shadow-xl transition-transform active:scale-[0.98]"
        >
          Siguiente <ArrowRight size={19} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 pb-[calc(env(safe-area-inset-bottom)+14px)] text-center">
        <p className="text-[12px] font-medium tracking-wide text-white/70">Designed and developed by mac336</p>
        <p className="mt-0.5 text-[10.5px] text-white/50">v{__APP_VERSION__}</p>
      </div>
    </div>
  )
}
