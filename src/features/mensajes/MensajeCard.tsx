import { Megaphone, TriangleAlert, Bell, Pencil, Trash2 } from 'lucide-react'
import type { Mensaje, MensajeTipo } from '@/types'
import { fechaCorta } from '@/lib/format'
import { cx } from '@/components/ui'

export const TIPO_META: Record<MensajeTipo, { label: string; Icon: typeof Bell }> = {
  aviso: { label: 'Aviso', Icon: Bell },
  anuncio: { label: 'Anuncio', Icon: Megaphone },
  incidencia: { label: 'Incidencia', Icon: TriangleAlert },
}

export function MensajeCard({ m, color, onEdit, onDelete, clamp }: {
  m: Mensaje
  color: string
  onEdit?: (m: Mensaje) => void
  onDelete?: (m: Mensaje) => void
  clamp?: boolean // tamaño uniforme + texto recortado con puntos suspensivos (Inicio)
}) {
  const { label, Icon } = TIPO_META[m.tipo]
  return (
    <div className={cx('flex flex-col rounded-[16px] p-4 text-[#172323] shadow-neu-sm', clamp && 'h-[150px]')} style={{ background: color }}>
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-black/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">
          <Icon size={13} /> {label}
        </span>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && <button onClick={() => onEdit(m)} aria-label="Editar" className="rounded-full p-1.5 hover:bg-black/10"><Pencil size={15} /></button>}
            {onDelete && <button onClick={() => onDelete(m)} aria-label="Borrar" className="rounded-full p-1.5 hover:bg-black/10"><Trash2 size={15} /></button>}
          </div>
        )}
      </div>
      <h3 className={cx('mt-2 font-display text-[16px] font-extrabold leading-snug', clamp && 'line-clamp-1')}>{m.titulo}</h3>
      <p className={cx('mt-1 text-[13.5px] leading-relaxed text-[#172323]/85', clamp ? 'line-clamp-2' : 'whitespace-pre-wrap')}>{m.cuerpo}</p>
      <div className={cx('mt-2 text-[11px] text-[#172323]/55', clamp && 'mt-auto pt-1')}>{fechaCorta(m.created_at)}</div>
    </div>
  )
}
