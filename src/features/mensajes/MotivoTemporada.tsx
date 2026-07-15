import type { ReactNode } from 'react'
import { Sun, Leaf, Snowflake, Heart, TriangleAlert, XCircle } from 'lucide-react'
import type { EstiloTemporada } from '@/types'
import { TEMPORADAS } from './postit'

// Motivo estacional del post-it. Se usa lucide donde existe (sol, hoja, copo,
// corazón) y SVG propio (paths del handoff) para flor, calabaza, máscara y vela.

function Svg({ size, color, label, children }: { size: number; color: string; label: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      {children}
    </svg>
  )
}

export function MotivoTemporada({ estilo, size = 18, color }: { estilo: EstiloTemporada; size?: number; color?: string }) {
  const t = TEMPORADAS[estilo]
  const c = color ?? t.tint
  switch (t.motivo) {
    case 'warning': return <TriangleAlert size={size} style={{ color: c }} aria-label="Warning" />
    case 'problem': return <XCircle size={size} style={{ color: c }} aria-label="Problem" />
    case 'sol': return <Sun size={size} style={{ color: c }} aria-label="Verano" />
    case 'hoja': return <Leaf size={size} style={{ color: c }} aria-label="Otoño" />
    case 'copo': return <Snowflake size={size} style={{ color: c }} aria-label="Navidad" />
    case 'corazon': return <Heart size={size} style={{ color: c }} aria-label="San Valentín" />
    case 'flor': return (
      <Svg size={size} color={c} label="Primavera">
        <circle cx={12} cy={12} r={2.6} />
        <circle cx={12} cy={5.2} r={3.1} /><circle cx={12} cy={18.8} r={3.1} />
        <circle cx={5.2} cy={12} r={3.1} /><circle cx={18.8} cy={12} r={3.1} />
      </Svg>
    )
    case 'calabaza': return (
      <Svg size={size} color={c} label="Halloween">
        <path d="M12 6c0-2 .6-3.4 2-4.5" />
        <path d="M12 6c-4.5 0-7.5 3-7.5 7s3 7 7.5 7 7.5-3 7.5-7-3-7-7.5-7z" />
        <path d="M9.2 6.6c-1.1 1.8-1.7 3.9-1.7 6.4 0 2.4.6 4.6 1.7 6.4" />
        <path d="M14.8 6.6c1.1 1.8 1.7 3.9 1.7 6.4 0 2.4-.6 4.6-1.7 6.4" />
      </Svg>
    )
    case 'mascara': return (
      <Svg size={size} color={c} label="Carnaval">
        <path d="M2 9.5C2 6.8 6.2 5 12 5s10 1.8 10 4.5c0 3.6-2.2 7-5.6 7-2 0-2.9-1.7-4.4-1.7S9.6 16.5 7.6 16.5C4.2 16.5 2 13.1 2 9.5z" />
        <circle cx={8} cy={9.8} r={1.6} /><circle cx={16} cy={9.8} r={1.6} />
      </Svg>
    )
    case 'vela': return (
      <Svg size={size} color={c} label="Semana Santa">
        <path d="M9.5 11h5v9h-5z" />
        <path d="M12 11V9" />
        <path d="M12 2.5c1.1 1.4 1.9 2.5 1.9 3.6a1.9 1.9 0 1 1-3.8 0c0-1.1.8-2.2 1.9-3.6z" />
      </Svg>
    )
  }
}
