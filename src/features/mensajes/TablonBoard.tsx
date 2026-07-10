import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import type { Mensaje, MensajeTipo } from '@/types'
import { ORDEN_TIPOS } from './postit'
import { PostItNote } from './PostItNote'
import { PostItPadModal } from './PostItPadModal'

const ROTS = ['-1deg', '0.8deg', '-0.6deg']

/** Tablón de la comunidad: una pila de post-its por tipo (aviso/anuncio/incidencia).
 *  Pulsar una pila abre el bloc de post-its. `mensajes` = actividad reciente ya filtrada. */
export function TablonBoard({ mensajes }: { mensajes: Mensaje[] }) {
  const nav = useNavigate()
  const [abierto, setAbierto] = useState<MensajeTipo | null>(null)

  const grupos = ORDEN_TIPOS
    .map((t) => ({ tipo: t, lista: mensajes.filter((m) => m.tipo === t).sort((a, b) => b.created_at.localeCompare(a.created_at)) }))
    .filter((g) => g.lista.length > 0)

  if (grupos.length === 0) return null

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-surface" style={{ boxShadow: '0 12px 26px -14px rgba(30,50,60,.35)' }}>
      <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2">
          <Megaphone size={18} strokeWidth={1.9} style={{ color: 'var(--primary-700)' }} />
          <span className="font-display text-[16px] font-extrabold text-ink">Tablón de la comunidad</span>
        </div>
        <button onClick={() => nav('/mensajes')} className="text-[12px] font-bold" style={{ color: 'var(--primary-700)' }}>Ver todo ›</button>
      </div>
      <div className="mx-3 mb-3 flex flex-col gap-4 rounded-[14px] p-[16px_14px]"
        style={{ background: 'repeating-linear-gradient(45deg,#EDF2F4 0 6px,#E8EEF1 6px 12px)', border: '1px solid #DDE5E9' }}>
        {grupos.map((g, i) => (
          <PostItNote key={g.tipo} grupo={g.lista} rot={ROTS[i % 3]} onClick={() => setAbierto(g.tipo)} />
        ))}
      </div>

      {abierto && (
        <PostItPadModal tipo={abierto} grupo={grupos.find((g) => g.tipo === abierto)!.lista} onClose={() => setAbierto(null)} />
      )}
    </div>
  )
}
