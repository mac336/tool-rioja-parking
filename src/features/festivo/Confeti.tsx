import { useMemo, type CSSProperties } from 'react'
import { ROJO_ES, AMARILLO_ES } from '@/lib/festivo'

// Confeti animado de fondo (detrás del contenido). No intercepta toques.
// Con prefers-reduced-motion queda estático (lo neutraliza global.css).
export function Confeti({ n = 22, opacity = 0.5 }: { n?: number; opacity?: number }) {
  const piezas = useMemo(() => Array.from({ length: n }, (_, i) => {
    const rect = i % 3 !== 0 // 2 de cada 3 son rectángulos; el resto puntos
    const color = i % 2 === 0 ? ROJO_ES : AMARILLO_ES
    const left = Math.round(Math.random() * 94)
    // Repartidas YA en pantalla (no fuera): así se ven aunque la animación no
    // corra (iOS "reducir movimiento") o tarde en arrancar.
    const top = Math.round(Math.random() * 92)
    const dur = 4 + Math.random() * 5 // 4–9 s
    const delay = -Math.random() * dur // desfase para que no vayan a la vez
    const anim = i % 2 === 0 ? 'confetti-a' : 'confetti-b'
    const style: CSSProperties = {
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      width: rect ? 9 : 8,
      height: rect ? 16 : 8,
      borderRadius: rect ? 2 : 999,
      background: color,
      animation: `${anim} ${dur.toFixed(2)}s ease-in-out infinite`,
      animationDelay: `${delay.toFixed(2)}s`,
    }
    return <span key={i} style={style} />
  }), [n])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
      {piezas}
    </div>
  )
}
