import { Megaphone, Pin } from 'lucide-react'
import type { Anuncio } from '@/types'
import { cx } from '@/components/ui'
import { fechaCorta } from '@/lib/format'

// Colores profundos (jewel tones) que mantienen contraste AA con texto blanco.
// Se asigna uno estable por anuncio a partir del hash de su id → tablón variado.
export const ANUNCIO_COLORS = ['#2E7D74', '#3E63C0', '#6E54C0', '#B0473F', '#9A6416', '#3E7D46', '#A85826']

export function colorDeAnuncio(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ANUNCIO_COLORS[h % ANUNCIO_COLORS.length]
}

const extracto = (cuerpo: string) => cuerpo.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim()

/** Tarjeta ilustrada de anuncio: color pleno + icono marca de agua + texto blanco. */
export function AnuncioIlustrado({ a, compact, destacado }: { a: Anuncio; compact?: boolean; destacado?: boolean }) {
  const color = colorDeAnuncio(a.id)
  return (
    <article
      className={cx('relative flex flex-col overflow-hidden rounded-[18px] text-white shadow-neu-sm',
        compact ? 'min-h-[104px] p-4' : 'min-h-[132px] p-4')}
      style={{ background: color }}>
      {/* marca de agua vectorial */}
      <Megaphone size={compact ? 84 : 104} strokeWidth={1.3}
        className="pointer-events-none absolute -bottom-5 -right-4 text-white/12" />
      {/* velo para reforzar el contraste del texto */}
      <span className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(0,0,0,.06), rgba(0,0,0,.3))' }} />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/25">
          <Megaphone size={17} strokeWidth={2} />
        </span>
        {destacado && (
          <span className="flex items-center gap-1 rounded-pill bg-white/25 px-2 py-0.5 text-[11px] font-bold">
            <Pin size={12} /> Destacado
          </span>
        )}
      </div>

      <h3 className={cx('relative z-10 mt-2 font-display font-bold leading-snug', compact ? 'text-[16px]' : 'text-[18px]')}>
        {a.titulo}
      </h3>
      {!compact && <p className="relative z-10 mt-1 line-clamp-2 text-[13px] text-white/90">{extracto(a.cuerpo)}</p>}
      <div className="relative z-10 mt-auto pt-2 text-[12px] text-white/80">
        {a.autor_nombre} · {a.vivienda} · hasta {fechaCorta(a.fecha_fin)}
      </div>
    </article>
  )
}
