import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShieldCheck } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta } from '@/lib/format'
import { esGestion } from '@/lib/roles'
import {
  anunciosPrincipales, anunciosListado, misAnuncios,
  anunciosPendientesGestion, resolverAnuncio,
} from '@/lib/api'
import { AnuncioCarousel } from '@/features/anuncios/AnuncioCarousel'
import { AnuncioIlustrado } from '@/features/anuncios/anuncioStyle'
import {
  Button, Card, Alert, EmptyState, ErrorState, SkeletonList, cx,
} from '@/components/ui'
import type { Anuncio, AnuncioEstado } from '@/types'

/** Extracto de una línea sin las marcas de markdown restringido. */
const extracto = (cuerpo: string) => cuerpo.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim()

const ESTADO_PILL: Record<AnuncioEstado, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-warn-soft text-warn-ink' },
  publicado: { label: 'Publicado', cls: 'bg-success-soft text-success-ink' },
  rechazado: { label: 'Rechazado', cls: 'bg-danger-soft text-danger-ink' },
  archivado: { label: 'Archivado', cls: 'bg-surface-2 text-muted' },
}
function EstadoPill({ estado }: { estado: AnuncioEstado }) {
  const s = ESTADO_PILL[estado]
  return <span className={cx('rounded-pill px-2.5 py-1 text-[12px] font-bold', s.cls)}>{s.label}</span>
}

type Tab = 'tablon' | 'mios' | 'moderacion'

export function AnunciosPage() {
  const { user, toast } = useApp()
  const gestion = esGestion(user.rol)
  const [tab, setTab] = useState<Tab>('tablon')

  const principales = useAsync(anunciosPrincipales, [])
  const listado = useAsync(anunciosListado, [])
  const mios = useAsync(misAnuncios, [user.id])
  const pendientes = useAsync(anunciosPendientesGestion, [])

  const resolver = async (
    a: Anuncio, accion: 'publicar' | 'rechazar', nivel?: 'principal' | 'secundario',
  ) => {
    await resolverAnuncio(a.id, accion, nivel)
    pendientes.refetch()
    listado.refetch()
    principales.refetch()
    mios.refetch()
    toast(accion === 'rechazar' ? 'Anuncio rechazado' : 'Anuncio publicado')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tablon', label: 'Tablón' },
    { key: 'mios', label: 'Míos' },
    ...(gestion ? [{ key: 'moderacion' as const, label: 'Moderación' }] : []),
  ]

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur safe-top">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Anuncios</h1>
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Secciones del tablón">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={cx('rounded-pill px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                tab === t.key ? 'bg-primary text-white' : 'bg-surface-2 text-muted hover:text-ink')}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {/* ---- Tablón ---- */}
        {tab === 'tablon' && (
          <div className="flex flex-col gap-5">
            {principales.state === 'ready' && principales.data && principales.data.length > 0 && (
              <AnuncioCarousel anuncios={principales.data} />
            )}

            <Link to="/anuncios/nuevo" className="block">
              <Button block size="lg"><Plus size={18} /> Publicar un anuncio</Button>
            </Link>

            <section>
              <h2 className="overline mb-2">Todos los anuncios</h2>
              {listado.state === 'loading' && <SkeletonList />}
              {listado.state === 'error' && <ErrorState onRetry={listado.refetch} />}
              {listado.state === 'empty' && (
                <EmptyState titulo="Nada por aquí todavía" texto="Sé el primero en publicar un anuncio para la comunidad." />
              )}
              {listado.state === 'ready' && listado.data && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {listado.data.map((a) => (
                    <AnuncioIlustrado key={a.id} a={a} destacado={a.nivel === 'principal'} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ---- Mis anuncios ---- */}
        {tab === 'mios' && (
          <section>
            {mios.state === 'loading' && <SkeletonList />}
            {mios.state === 'error' && <ErrorState onRetry={mios.refetch} />}
            {mios.state === 'empty' && (
              <EmptyState titulo="No tienes anuncios" texto="Cuando publiques un anuncio aparecerá aquí con su estado.">
                <Link to="/anuncios/nuevo"><Button variant="secondary">Publicar un anuncio</Button></Link>
              </EmptyState>
            )}
            {mios.state === 'ready' && mios.data && (
              <div className="flex flex-col gap-3">
                {mios.data.map((a) => (
                  <Card key={a.id}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[16px] font-bold text-ink">{a.titulo}</h3>
                      <EstadoPill estado={a.estado} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted">{extracto(a.cuerpo)}</p>
                    <div className="mt-2 text-[12px] text-faint">
                      Solicitado: {a.nivel_solicitado === 'principal' ? 'Tablón principal' : 'Listado'}
                      {' · '}vigencia hasta {fechaCorta(a.fecha_fin)}
                    </div>
                    {a.estado === 'rechazado' && a.motivo_rechazo && (
                      <p className="mt-2 text-[13px] text-danger">Motivo: {a.motivo_rechazo}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- Cola de moderación (solo gestión) ---- */}
        {tab === 'moderacion' && gestion && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-muted">
              <ShieldCheck size={16} />
              <h2 className="overline">Cola de moderación</h2>
            </div>
            {pendientes.state === 'loading' && <SkeletonList />}
            {pendientes.state === 'error' && <ErrorState onRetry={pendientes.refetch} />}
            {pendientes.state === 'empty' && (
              <EmptyState titulo="Nada pendiente" texto="No hay anuncios esperando revisión." />
            )}
            {pendientes.state === 'ready' && pendientes.data && (
              <div className="flex flex-col gap-3">
                {pendientes.data.map((a) => (
                  <Card key={a.id}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[16px] font-bold text-ink">{a.titulo}</h3>
                      <span className="shrink-0 rounded-pill bg-surface-2 px-2.5 py-1 text-[12px] font-bold text-muted">
                        Pide: {a.nivel_solicitado === 'principal' ? 'Principal' : 'Secundario'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[13px] text-muted">{extracto(a.cuerpo)}</p>
                    <div className="mt-2 text-[12px] text-faint">
                      {a.autor_nombre} · {a.vivienda} · hasta {fechaCorta(a.fecha_fin)}
                    </div>

                    {a.revision_larga && (
                      <div className="mt-3"><Alert tipo="warn">Duración &gt; 1 año: revisar</Alert></div>
                    )}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button block onClick={() => resolver(a, 'publicar', 'principal')}>Publicar en principal</Button>
                      <Button block variant="secondary" onClick={() => resolver(a, 'publicar', 'secundario')}>Publicar en secundario</Button>
                      <Button block variant="danger-outline" onClick={() => resolver(a, 'rechazar')}>Rechazar</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
