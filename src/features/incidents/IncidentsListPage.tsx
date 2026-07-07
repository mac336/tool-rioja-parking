import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, MapPin } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Card, StatusChip, CategoryChip, EmptyState, ErrorState, SkeletonList, Fab, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta } from '@/lib/format'
import { listIncidencias } from '@/lib/api'
import type { Incident, IncidentStatus } from '@/types'

type Filtro = 'todas' | Extract<IncidentStatus, 'abierta' | 'en_curso' | 'resuelta'>

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'abierta', label: 'Abiertas' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'resuelta', label: 'Resueltas' },
]

function IncidentCard({ inc }: { inc: Incident }) {
  const cerrada = inc.estado === 'resuelta' || inc.estado === 'cerrada'
  const meta = [
    inc.ubicacion,
    `reportada por ${inc.autor_vivienda}`,
    fechaCorta(inc.created_at),
  ].filter(Boolean).join(' · ')

  return (
    <Link to={`/incidencias/${inc.id}`} className="block">
      <Card className={cx('transition-colors hover:border-border-strong', cerrada && 'opacity-60')}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-ink">{inc.titulo}</h3>
          <StatusChip status={inc.estado} />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[13px] text-muted">
          {inc.ubicacion && <MapPin size={14} className="shrink-0 text-faint" />}
          <span className="truncate">{meta}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[12px] text-faint">
          <MessageCircle size={14} />
          {inc.comentarios.length} {inc.comentarios.length === 1 ? 'comentario' : 'comentarios'}
        </div>
      </Card>
    </Link>
  )
}

export function IncidentsListPage() {
  const nav = useNavigate()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const { data, state, refetch } = useAsync(listIncidencias, [])

  const items = data ?? []
  const filtradas = filtro === 'todas' ? items : items.filter((i) => i.estado === filtro)

  return (
    <div>
      <header className="border-b border-border bg-surface px-4 pb-3 pt-5">
        <h1 className="font-display text-[26px] font-extrabold text-ink">Incidencias</h1>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTROS.map((f) => (
            <CategoryChip key={f.key} active={filtro === f.key} onClick={() => setFiltro(f.key)}>
              {f.label}
            </CategoryChip>
          ))}
        </div>
      </header>

      <Page>
        {state === 'loading' && <SkeletonList />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'empty' && (
          <EmptyState titulo="Todo en orden por aquí" texto="No hay incidencias." />
        )}
        {state === 'ready' && (
          filtradas.length === 0 ? (
            <EmptyState titulo="Todo en orden por aquí" texto="No hay incidencias con este filtro." />
          ) : (
            <div className="flex flex-col gap-3">
              {filtradas.map((inc) => <IncidentCard key={inc.id} inc={inc} />)}
            </div>
          )
        )}
      </Page>

      <Fab onClick={() => nav('/incidencias/nueva')} label="Nueva incidencia" />
    </div>
  )
}
