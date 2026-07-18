import { ROJO_ES, AMARILLO_ES } from '@/lib/festivo'

// Banderines (bunting) colgando de una cuerda curva. Ancho completo.
export function Banderines({ className }: { className?: string }) {
  const n = 8
  const x0 = 8, x1 = 352
  const puntos = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) / (n - 1)) * i)
  // y de la cuerda: M0 4 Q 180 18 360 4  → cuadrática; aproximamos y por x.
  const cuerdaY = (x: number) => {
    const t = x / 360
    return 4 * (1 - t) * (1 - t) + 18 * 2 * (1 - t) * t + 4 * t * t
  }
  return (
    <svg viewBox="0 0 360 26" preserveAspectRatio="none" aria-hidden className={className} style={{ width: '100%', height: 26 }}>
      <path d="M0 4 Q 180 18 360 4" fill="none" stroke="#3A454F" strokeWidth={1.6} />
      {puntos.map((x, i) => {
        const y = cuerdaY(x)
        const color = i % 2 === 0 ? ROJO_ES : AMARILLO_ES
        return <path key={i} d={`M${x - 7} ${y} L${x + 7} ${y} L${x} ${y + 14} Z`} fill={color} />
      })}
    </svg>
  )
}

// Bandera de España en SVG (sin emoji, que no renderiza en Windows/Chrome).
export function BanderaEspana({ w = 30, h = 21 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 30 21" aria-label="Bandera de España" role="img"
      style={{ borderRadius: 3.5, boxShadow: '0 2px 5px rgba(0,0,0,.25)', display: 'block' }}>
      <rect x="0" y="0" width="30" height="21" rx="3.5" fill={AMARILLO_ES} />
      <rect x="0" y="0" width="30" height="5.25" fill={ROJO_ES} />
      <rect x="0" y="15.75" width="30" height="5.25" fill={ROJO_ES} />
    </svg>
  )
}
