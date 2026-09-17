import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { useApp } from '@/store'
import { puedePublicarTipo, tiposQueVe } from '@/lib/roles'
import { listMensajes, borrarMensaje } from '@/lib/api'
import type { Mensaje, MensajeTipo } from '@/types'
import { MensajeCard } from './MensajeCard'
import { AsistenteMensaje } from './AsistenteMensaje'

// Orden fijo de las pestañas. Las visibles y las creables dependen de los
// PERMISOS POR TIPO del rol. El alta y la edición las lleva AsistenteMensaje,
// el mismo asistente que usan el buzón y Sugerencias (v1.54.0).
const ORDEN: MensajeTipo[] = ['aviso', 'anuncio', 'incidencia', 'sugerencia']
const SECCION: Record<MensajeTipo, string> = { aviso: 'Avisos', anuncio: 'Anuncios', incidencia: 'Incidencias', sugerencia: 'Sugerencias' }

export function MensajesPage() {
  const { user, msgColors, toast } = useApp()
  const tabsVisibles = ORDEN.filter((t) => tiposQueVe(user.rol).includes(t))
  const creables = ORDEN.filter((t) => t !== 'sugerencia' && puedePublicarTipo(user.rol, t))
  const { data, state, refetch } = useAsync(listMensajes, [], { key: 'mensajes', ttlMs: TTL.mensajes })

  const [tab, setTab] = useState<MensajeTipo>(tabsVisibles[0] ?? 'aviso')
  const [asistente, setAsistente] = useState<{ edicion?: Mensaje } | null>(null)

  const borrar = async (m: Mensaje) => {
    if (!window.confirm(`¿Borrar "${m.titulo}"?`)) return
    try { await borrarMensaje(m.id); toast('Mensaje borrado', 'info'); refetch() }
    catch { toast('No se pudo borrar el mensaje', 'error') }
  }

  const conteo = (t: MensajeTipo) => (data ?? []).filter((m) => m.tipo === t).length
  const items = (data ?? []).filter((m) => m.tipo === tab)

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur safe-top">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
          <h1 className="font-display text-[22px] font-extrabold text-ink">Mensajes</h1>
          {creables.includes(tab) && (
            <button onClick={() => setAsistente({})} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
              <Plus size={18} /> Nuevo
            </button>
          )}
        </div>
        {/* Pestañas por tipo con contador. El scroll horizontal se queda SOLO en
            esta fila (overflow-x-auto + nowrap + shrink-0), no en toda la pantalla. */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabsVisibles.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cx('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                tab === t ? 'bg-primary text-white' : 'bg-surface-2 text-muted')}>
              {SECCION[t]}
              <span className={cx('inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold',
                tab === t ? 'bg-white/25 text-white' : 'bg-black/10 text-muted')}>{conteo(t)}</span>
            </button>
          ))}
        </div>
      </header>

      <Page className="flex flex-col gap-2.5">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {tab === 'sugerencia' && items.length > 0 && (
          <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
            Las sugerencias las publican los vecinos desde el buzón. Para aprobarlas o rechazarlas ve a <b>Gestión → Publicaciones</b>.
          </p>
        )}
        {state !== 'loading' && state !== 'error' && items.length === 0 && (
          <EmptyState titulo={`Sin ${SECCION[tab].toLowerCase()}`}
            texto={tab === 'sugerencia' ? 'Las sugerencias las envían los vecinos desde el buzón y se aprueban en Publicaciones.' : creables.includes(tab) ? 'Pulsa “Nuevo” para publicar uno.' : 'No hay nada por ahora.'} />
        )}
        {items.map((m) => (
          <MensajeCard key={m.id} m={m} color={msgColors[m.tipo]}
            onEdit={puedePublicarTipo(user.rol, m.tipo) && m.tipo !== 'sugerencia' ? (m) => setAsistente({ edicion: m }) : undefined}
            onDelete={puedePublicarTipo(user.rol, m.tipo) ? borrar : undefined} />
        ))}
      </Page>
      {/* Alta y edición: el asistente ÚNICO, compartido con Buzón y Sugerencias. */}
      {asistente && (
        <AsistenteMensaje
          origen="gestion"
          tipos={creables}
          edicion={asistente.edicion}
          onCerrar={() => setAsistente(null)}
          onHecho={refetch} />
      )}
    </div>
  )
}
