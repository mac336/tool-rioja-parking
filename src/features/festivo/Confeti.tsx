import { useMemo, type CSSProperties } from 'react'
import { ROJO_ES, AMARILLO_ES } from '@/lib/festivo'

// Confeti animado de fondo (detrás del contenido). No intercepta toques.
// Con prefers-reduced-motion queda estático (lo neutraliza global.css).
export function Confeti({ n = 22, opacity = 0.5 }: { n?: number; opacity?: number }) {
  const piezas = useMemo(() => Array.from({ length: n }, (_, i) => {
    const rect = i % 3 !== 0 // 2 de cada 3 son rectángulos; el resto puntos
    const color = i % 2 === 0 ? ROJO_ES : AMARILLO_ES
    const left = Math.round(Math.random() * 96)
    const dur = 6 + Math.random() * 6 // 6–12 s
    const delay = -Math.random() * dur // ya en marcha al cargar
    const anim = i % 2 === 0 ? 'confetti-a' : 'confetti-b'
    const style: CSSProperties = {
      position: 'absolute',
      left: `${left}%`,
      top: -24,
      width: rect ? 9 : 8,
      height: rect ? 16 : 8,
      borderRadius: rect ? 2 : 999,
      background: color,
      ['--fall' as string]: '110vh',
      animation: `${anim} ${dur.toFixed(2)}s linear infinite`,
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
