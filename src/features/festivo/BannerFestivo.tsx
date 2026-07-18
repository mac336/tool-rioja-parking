import { BanderaEspana } from './Banderines'

// Banner "¡Vamos España!" (o "¡ESPAÑA CAMPEONES 2026!") antes del tablón.
export function BannerFestivo({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="mb-2.5 flex shrink-0 items-center gap-3 rounded-[16px] px-4 py-3 text-white"
      style={{
        background: 'linear-gradient(120deg,#B22A1E,#D6392B 55%,#C99117)',
        boxShadow: '0 12px 26px -12px rgba(214,57,43,.5)',
      }}>
      <img src="/balon.png" alt="" width={34} height={34}
        style={{ borderRadius: 999, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.35))' }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[16px] font-extrabold leading-tight" style={{ letterSpacing: '-0.015em' }}>{titulo}</div>
        {subtitulo && <div className="truncate text-[12px] text-white/85">{subtitulo}</div>}
      </div>
      <BanderaEspana />
    </div>
  )
}
