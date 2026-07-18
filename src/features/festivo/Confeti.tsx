import { useMemo, type CSSProperties } from 'react'
import { ROJO_ES, AMARILLO_ES } from '@/lib/festivo'

// Confeti animado de fondo (detrás del contenido). No intercepta toques.
// Con prefers-reduced-motion queda estático (lo neutraliza global.css).
export function Confeti({ n = 22, opacity = 0.5 }: { n?: number; opacity?: number }) {
  const piezas = useMemo(() => Array.from({ length: n }, (_, i) => {
    const rect = i % 3 !== 0 // 2 de cada 3 son rectángulos; el resto puntos
    const color = i % 2 === 0 ? ROJO_ES : AMARILLO_ES
    const left = Math.round(Math.random() * 94)
    const dur = 5 + Math.random() * 5 // 5–10 s (velocidad de caída)
    const delay = -Math.random() * dur // desfase: reparte las piezas por la caída
    const anim = i % 2 === 0 ? 'confetti-a' : 'confetti-b'
    // La animación va en una custom prop para poder re-activarla bajo
    // "reducir movimiento" (ver .confeti-pieza en global.css).
    const shorthand = `${anim} ${dur.toFixed(2)}s linear ${delay.toFixed(2)}s infinite`
    const style: CSSProperties = {
      position: 'absolute',
      left: `${left}%`,
      top: 0,
      width: rect ? 9 : 8,
      height: rect ? 16 : 8,
      borderRadius: rect ? 2 : 999,
      background: color,
      ['--conf-anim' as string]: shorthand,
      animation: 'var(--conf-anim)',
    }
    return <span key={i} className="confeti-pieza" style={style} />
  }), [n])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
      {piezas}
    </div>
  )
}
