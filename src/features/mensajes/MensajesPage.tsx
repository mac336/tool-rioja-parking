import { useState } from 'react'
import { Plus, Archive, CircleCheck } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { useApp } from '@/store'
import { puedePublicarTipo, tiposQueVe, esAppAdmin } from '@/lib/roles'
import { listMensajes, borrarMensaje, cerrarMensaje } from '@/lib/api'
import type { Mensaje, MensajeTipo } from '@/types'
import { MensajeCard } from './MensajeCard'
import { AsistenteMensaje } from './AsistenteMensaje'
import { esActividadDeTablon } from './actividadTablon'

// Orden fijo de las pestañas. Las visibles y las creables dependen de los
// PERMISOS POR TIPO del rol. El alta y la edición las lleva AsistenteMensaje,
// el mismo asistente que usan el buzón y Sugerencias (v1.54.0).
const ORDEN: MensajeTipo[] = ['aviso', 'anuncio', 'incidencia', 'sugerencia']
const SECCION: Record<MensajeTipo, string> = { aviso: 'Avisos', anuncio: 'Anuncios', incidencia: 'Incidencias', sugerencia: 'Sugerencias' }

// Pestaña extra SOLO para el app_admin: lo que ya no se ve en el tablón
// (caducado o cerrado). Es donde se limpia de verdad, porque borrar la tarjeta
// se lleva por delante sus comentarios y sus fotos (cascade). v1.56.0.
const CADUCADOS = '__caducados' as const
type Tab = MensajeTipo | typeof CADUCADOS

export function MensajesPage() {
  const { user, msgColors, toast } = useApp()
  const tabsVisibles = ORDEN.filter((t) => tiposQueVe(user.rol).includes(t))
  const creables = ORDEN.filter((t) => t !== 'sugerencia' && puedePublicarTipo(user.rol, t))
  const { data, state, refetch } = useAsync(listMensajes, [], { key: 'mensajes', ttlMs: TTL.mensajes })

  const verCaducados = esAppAdmin(user.rol)
  const [tab, setTab] = useState<Tab>(tabsVisibles[0] ?? 'aviso')
  const [asistente, setAsistente] = useState<{ edicion?: Mensaje } | null>(null)

  const borrar = async (m: Mensaje) => {
    if (!window.confirm(`¿Borrar "${m.titulo}"?`)) return
    try { await borrarMensaje(m.id); toast('Mensaje borrado', 'info'); refetch() }
    catch { toast('No se pudo borrar el mensaje', 'error') }
  }

  const cerrar = async (m: Mensaje) => {
    if (!window.confirm(`¿Marcar "${m.titulo}" como cerrada? Deja de verse en el tablón, pero no se borra.`)) return
    try { await cerrarMensaje(m.id); toast('Incidencia cerrada', 'ok'); refetch() }
    catch { toast('No se pudo cerrar', 'error') }
  }

  const ahora = Date.now()
  const fueraDelTablon = (m: Mensaje) => !esActividadDeTablon(m, ahora)
  const caducados = (data ?? []).filter(fueraDelTablon)
  const conteo = (t: Tab) => t === CADUCADOS ? caducados.length : (data ?? []).filter((m) => m.tipo === t).length
  const items = tab === CADUCADOS ? caducados : (data ?? []).filter((m) => m.tipo === tab)

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur safe-top">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
          <h1 className="font-display text-[22px] font-extrabold text-ink">Mensajes</h1>
          {tab !== CADUCADOS && creables.includes(tab as MensajeTipo) && (
            <button onClick={() => setAsistente({})} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
              <Plus size={18} /> Nuevo
            </button>
          )}
        </div>
        {/* Pestañas por tipo con contador. El scroll horizontal se queda SOLO en
            esta fila (overflow-x-auto + nowrap + shrink-0), no en toda la pantalla. */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...tabsVisibles, ...(verCaducados ? [CADUCADOS] : [])].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cx('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                tab === t ? 'bg-primary text-white' : 'bg-surface-2 text-muted')}>
              {t === CADUCADOS ? <><Archive size={13} /> Caducados</> : SECCION[t]}
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
        {tab === CADUCADOS && items.length > 0 && (
          <p className="rounded-[12px] bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">
            Estas tarjetas ya <b>no se ven en el tablón</b> (caducaron o se cerraron). Al borrarlas se van
            también <b>sus comentarios y sus fotos</b>, y eso no tiene vuelta atrás.
          </p>
        )}
        {state !== 'loading' && state !== 'error' && items.length === 0 && (
          <EmptyState titulo={tab === CADUCADOS ? 'Nada caducado' : `Sin ${SECCION[tab as MensajeTipo].toLowerCase()}`}
            texto={tab === CADUCADOS ? 'Aquí aparecerán las tarjetas que dejen de verse en el tablón, para poder borrarlas.'
              : tab === 'sugerencia' ? 'Las sugerencias las envían los vecinos desde el buzón y se aprueban en Publicaciones.'
              : creables.includes(tab as MensajeTipo) ? 'Pulsa “Nuevo” para publicar uno.' : 'No hay nada por ahora.'} />
        )}
        {items.map((m) => (
          <div key={m.id} className="flex flex-col gap-1">
            <MensajeCard m={m} color={msgColors[m.tipo]}
              onEdit={puedePublicarTipo(user.rol, m.tipo) && m.tipo !== 'sugerencia' ? (x) => setAsistente({ edicion: x }) : undefined}
              onDelete={puedePublicarTipo(user.rol, m.tipo) ? borrar : undefined} />
            {/* «Cerrada»: solo en incidencias ABIERTAS. Las incidencias no caducan
                solas, así que sin esto no había forma de retirar una ya resuelta. */}
            {m.tipo === 'incidencia' && !fueraDelTablon(m) && puedePublicarTipo(user.rol, 'incidencia') && (
              <button type="button" onClick={() => void cerrar(m)}
                className="self-start rounded-pill border border-border bg-surface px-3 py-1 text-[12.5px] font-bold text-muted hover:bg-surface-2">
                <span className="flex items-center gap-1.5"><CircleCheck size={14} /> Marcar como cerrada</span>
              </button>
            )}
          </div>
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
