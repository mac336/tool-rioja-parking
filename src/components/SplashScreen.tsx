import { useEffect, useState } from 'react'
import { Logo } from '@/components/Logo'
import { cx } from '@/components/ui'

/** Pantalla de bienvenida al abrir la app. Aparece, se mantiene y se desvanece. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const a = requestAnimationFrame(() => setEntered(true))
    const b = setTimeout(() => setLeaving(true), 1900)
    const c = setTimeout(onDone, 2450)
    return () => { cancelAnimationFrame(a); clearTimeout(b); clearTimeout(c) }
  }, [onDone])

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
      </div>

      {/* Pie sutil */}
      <p className={cx('absolute bottom-10 text-[12px] text-white/60 transition-opacity duration-700', entered ? 'opacity-100' : 'opacity-0')}>
        Gestiones de la comunidad, al alcance de todos
      </p>
    </div>
  )
}
