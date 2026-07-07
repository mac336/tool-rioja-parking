import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Anuncio } from '@/types'
import { cx } from '@/components/ui'
import { AnuncioIlustrado } from './anuncioStyle'

const prefiereReducir = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Carrusel del tablón principal: rota ~10s, con puntos manuales, pausa al
 *  interactuar y sin auto-rotación si el usuario pidió reducir movimiento. */
export function AnuncioCarousel({ anuncios, compact }: { anuncios: Anuncio[]; compact?: boolean }) {
  const nav = useNavigate()
  const [i, setI] = useState(0)
  const [pausado, setPausado] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (anuncios.length <= 1 || pausado || prefiereReducir()) return
    timer.current = window.setInterval(() => setI((x) => (x + 1) % anuncios.length), 10_000)
    return () => window.clearInterval(timer.current)
  }, [anuncios.length, pausado])

  if (anuncios.length === 0) return null
  const a = anuncios[Math.min(i, anuncios.length - 1)]

  return (
    <section aria-roledescription="carrusel" aria-label="Tablón principal"
      onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)} onBlurCapture={() => setPausado(false)}>
      <button onClick={() => nav('/anuncios')} className="block w-full text-left" aria-label={`Ver anuncio: ${a.titulo}`}>
        <AnuncioIlustrado a={a} compact={compact} destacado />
      </button>
      {anuncios.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2" role="tablist" aria-label="Anuncios destacados">
          {anuncios.map((_, k) => (
            <button key={k} role="tab" aria-selected={k === i} aria-label={`Anuncio ${k + 1}`}
              onClick={() => setI(k)}
              className={cx('h-2.5 rounded-full transition-all', k === i ? 'w-6 bg-primary' : 'w-2.5 bg-border-strong')} />
          ))}
        </div>
      )}
    </section>
  )
}
