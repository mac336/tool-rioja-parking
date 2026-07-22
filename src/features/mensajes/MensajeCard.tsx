import { Megaphone, TriangleAlert, Bell, Pencil, Trash2, Lightbulb } from 'lucide-react'
import type { Mensaje, MensajeTipo } from '@/types'
import { fechaCorta } from '@/lib/format'
import { cx } from '@/components/ui'
import { Adjuntos } from '@/components/Adjuntos'
import { TEMPORADAS, IMPORTANCIA_COLOR, pastelHex } from './postit'
import { MotivoTemporada } from './MotivoTemporada'

export const TIPO_META: Record<MensajeTipo, { label: string; Icon: typeof Bell }> = {
  aviso: { label: 'Aviso', Icon: Bell },
  anuncio: { label: 'Anuncio', Icon: Megaphone },
  incidencia: { label: 'Incidencia', Icon: TriangleAlert },
  sugerencia: { label: 'Sugerencia', Icon: Lightbulb },
}

export function MensajeCard({ m, color, onEdit, onDelete, clamp }: {
  m: Mensaje
  color: string
  onEdit?: (m: Mensaje) => void
  onDelete?: (m: Mensaje) => void
  clamp?: boolean // tamaño uniforme + texto recortado con puntos suspensivos (Inicio)
}) {
  const { label, Icon } = TIPO_META[m.tipo]
  const t = m.estilo ? TEMPORADAS[m.estilo] : null
  const imp = (m.tipo === 'aviso' || m.tipo === 'incidencia') ? (m.importancia ?? null) : null
  const impColor = imp === 'alta' ? IMPORTANCIA_COLOR.alta : imp === 'media' ? IMPORTANCIA_COLOR.media : null
  return (
    <div className={cx('relative flex flex-col overflow-hidden rounded-[16px] p-4 text-[#172323] shadow-neu-sm', clamp && 'h-[150px]')}
      style={{ background: pastelHex(m.color) ?? (t ? t.paper : color) }}>
      {t && (
        <div className="pointer-events-none absolute" style={{ right: -12, bottom: -14, opacity: 0.12, transform: 'rotate(-12deg)' }}>
          <MotivoTemporada estilo={m.estilo!} size={104} color={t.tint} />
        </div>
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-black/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">
            <Icon size={13} /> {label}
          </span>
          {impColor && (
            <span className="inline-block rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
              style={{ color: impColor, border: `1.5px solid ${impColor}` }}>{imp === 'alta' ? 'Urgente' : 'Importante'}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {t && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" aria-label={`Estilo ${t.etiqueta}`}
              style={{ border: `1.5px solid ${t.tint}` }}>
              <MotivoTemporada estilo={m.estilo!} size={13} color={t.tint} />
            </span>
          )}
          {onEdit && <button onClick={() => onEdit(m)} aria-label="Editar" className="rounded-full p-1.5 hover:bg-black/10"><Pencil size={15} /></button>}
          {onDelete && <button onClick={() => onDelete(m)} aria-label="Borrar" className="rounded-full p-1.5 hover:bg-black/10"><Trash2 size={15} /></button>}
        </div>
      </div>
      <h3 className={cx('relative mt-2 font-display text-[16px] font-extrabold leading-snug', clamp && 'line-clamp-1')}>{m.titulo}</h3>
      <p className={cx('relative mt-1 text-[13.5px] leading-relaxed text-[#172323]/85', clamp ? 'line-clamp-2' : 'whitespace-pre-wrap')}>{m.cuerpo}</p>
      {!clamp && <Adjuntos urls={m.adjuntos} />}
      <div className={cx('relative mt-2 text-[11px] text-[#172323]/55', clamp && 'mt-auto pt-1')}>{fechaCorta(m.created_at)}</div>
    </div>
  )
}
