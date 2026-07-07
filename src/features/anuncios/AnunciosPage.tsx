import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShieldCheck, Flag, Pencil, Trash2, ArrowLeftRight, EyeOff, Lock, Unlock } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta } from '@/lib/format'
import { esGestion, puedeAprobarAltas } from '@/lib/roles'
import { PISOS } from '@/lib/parking'
import {
  anunciosPrincipales, anunciosListado, misAnuncios,
  anunciosPendientesGestion, resolverAnuncio,
  borrarAnuncio, moverNivelAnuncio, despublicarAnuncio,
  reportarAnuncio, listReportes, descartarReporte,
  listViviendasBloqueadas, bloquearVivienda,
} from '@/lib/api'
import { AnuncioCarousel } from '@/features/anuncios/AnuncioCarousel'
import { AnuncioIlustrado } from '@/features/anuncios/anuncioStyle'
import {
  Button, Card, Textarea, SelectField, Alert, EmptyState, ErrorState, SkeletonList, cx,
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

/** Pie discreto bajo cada card publicada del tablón para reportar contenido. */
function ReportarPie({ anuncioId }: { anuncioId: string }) {
  const { toast } = useApp()
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    if (!motivo.trim()) return
    setEnviando(true)
    try {
      await reportarAnuncio(anuncioId, motivo.trim())
      toast('Gracias, lo revisaremos')
      setAbierto(false)
      setMotivo('')
    } catch {
      toast('No hemos podido enviar el reporte', 'error')
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-1.5 inline-flex items-center gap-1 self-start text-[12px] font-semibold text-faint hover:text-danger">
        <Flag size={13} /> Reportar
      </button>
    )
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <Textarea label="Motivo del reporte" value={motivo} rows={2}
        onChange={(e) => setMotivo(e.target.value)} placeholder="¿Qué problema tiene este anuncio?" />
      <div className="flex gap-2">
        <Button variant="danger" disabled={!motivo.trim() || enviando} onClick={enviar}>
          {enviando ? 'Enviando…' : 'Enviar reporte'}
        </Button>
        <Button variant="ghost" onClick={() => { setAbierto(false); setMotivo('') }}>Cancelar</Button>
      </div>
    </div>
  )
}

type Tab = 'tablon' | 'mios' | 'moderacion'

export function AnunciosPage() {
  const { user, toast } = useApp()
  const gestion = esGestion(user.rol)
  const puedeBloquear = puedeAprobarAltas(user.rol)
  const [tab, setTab] = useState<Tab>('tablon')
  const [viviendaSel, setViviendaSel] = useState<string>(PISOS[0])

  const principales = useAsync(anunciosPrincipales, [])
  const listado = useAsync(anunciosListado, [])
  const mios = useAsync(misAnuncios, [user.id])
  const pendientes = useAsync(anunciosPendientesGestion, [])
  const reportes = useAsync(listReportes, [])
  const bloqueadas = useAsync(listViviendasBloqueadas, [])

  const refetchPublicados = () => { listado.refetch(); principales.refetch() }

  const resolver = async (
    a: Anuncio, accion: 'publicar' | 'rechazar', nivel?: 'principal' | 'secundario',
  ) => {
    await resolverAnuncio(a.id, accion, nivel)
    pendientes.refetch()
    refetchPublicados()
    mios.refetch()
    toast(accion === 'rechazar' ? 'Anuncio rechazado' : 'Anuncio publicado')
  }

  const borrar = async (a: Anuncio) => {
    if (!window.confirm('¿Borrar este anuncio? Esta acción no se puede deshacer.')) return
    await borrarAnuncio(a.id)
    mios.refetch()
    refetchPublicados()
    toast('Anuncio borrado')
  }

  const moverNivel = async (a: Anuncio) => {
    const destino = a.nivel === 'principal' ? 'secundario' : 'principal'
    await moverNivelAnuncio(a.id, destino)
    refetchPublicados()
    toast(destino === 'principal' ? 'Movido a principal' : 'Movido a secundario')
  }

  const despublicar = async (a: Anuncio) => {
    if (!window.confirm('¿Despublicar este anuncio? Dejará de verse en el tablón.')) return
    await despublicarAnuncio(a.id)
    refetchPublicados()
    toast('Anuncio despublicado')
  }

  const descartar = async (id: string) => {
    await descartarReporte(id)
    reportes.refetch()
    toast('Reporte descartado')
  }

  const alternarBloqueo = async (vivienda: string, bloquear: boolean) => {
    await bloquearVivienda(vivienda, bloquear)
    bloqueadas.refetch()
    toast(bloquear ? `Vivienda ${vivienda} bloqueada` : `Vivienda ${vivienda} desbloqueada`)
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
                    <div key={a.id} className="flex flex-col">
                      <AnuncioIlustrado a={a} destacado={a.nivel === 'principal'} />
                      <ReportarPie anuncioId={a.id} />
                    </div>
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
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {(a.estado === 'pendiente' || a.estado === 'rechazado') && (
                        <Link to={`/anuncios/${a.id}/editar`} className="sm:flex-1">
                          <Button block variant="secondary"><Pencil size={16} /> Editar</Button>
                        </Link>
                      )}
                      <Button block variant="danger-outline" className="sm:flex-1" onClick={() => borrar(a)}>
                        <Trash2 size={16} /> Borrar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- Moderación (solo gestión) ---- */}
        {tab === 'moderacion' && gestion && (
          <div className="flex flex-col gap-8">
            {/* Cola de pendientes */}
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

            {/* Publicados: mover nivel / despublicar */}
            <section>
              <h2 className="overline mb-2">Publicados</h2>
              {listado.state === 'loading' && <SkeletonList />}
              {listado.state === 'error' && <ErrorState onRetry={listado.refetch} />}
              {listado.state === 'empty' && (
                <EmptyState titulo="Sin anuncios publicados" texto="Cuando publiques anuncios aparecerán aquí para gestionarlos." />
              )}
              {listado.state === 'ready' && listado.data && (
                <div className="flex flex-col gap-3">
                  {listado.data.map((a) => (
                    <Card key={a.id}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-[16px] font-bold text-ink">{a.titulo}</h3>
                        <span className={cx('shrink-0 rounded-pill px-2.5 py-1 text-[12px] font-bold',
                          a.nivel === 'principal' ? 'bg-success-soft text-success-ink' : 'bg-surface-2 text-muted')}>
                          {a.nivel === 'principal' ? 'Principal' : 'Secundario'}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-faint">
                        {a.autor_nombre} · {a.vivienda} · hasta {fechaCorta(a.fecha_fin)}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button block variant="secondary" onClick={() => moverNivel(a)}>
                          <ArrowLeftRight size={16} /> Mover a {a.nivel === 'principal' ? 'secundario' : 'principal'}
                        </Button>
                        <Button block variant="danger-outline" onClick={() => despublicar(a)}>
                          <EyeOff size={16} /> Despublicar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Reportes de contenido */}
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-muted">
                <Flag size={16} />
                <h2 className="overline">Reportes</h2>
              </div>
              {reportes.state === 'loading' && <SkeletonList />}
              {reportes.state === 'error' && <ErrorState onRetry={reportes.refetch} />}
              {reportes.state === 'empty' && (
                <EmptyState titulo="Sin reportes" texto="No hay contenido reportado por los vecinos." />
              )}
              {reportes.state === 'ready' && reportes.data && (
                <div className="flex flex-col gap-3">
                  {reportes.data.map((r) => (
                    <Card key={r.id}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-[15px] font-bold text-ink">{r.entidad_titulo}</h3>
                        <span className="shrink-0 text-[12px] text-faint">{fechaCorta(r.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted">Motivo: {r.motivo}</p>
                      <div className="mt-1 text-[12px] text-faint">Reportado por {r.autor}</div>
                      <div className="mt-3">
                        <Button variant="secondary" onClick={() => descartar(r.id)}>Descartar</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Bloqueo de viviendas */}
            {puedeBloquear && (
              <section>
                <div className="mb-2 flex items-center gap-1.5 text-muted">
                  <Lock size={16} />
                  <h2 className="overline">Bloqueo de viviendas</h2>
                </div>
                <Card>
                  <p className="text-[13px] text-muted">
                    Una vivienda bloqueada no puede publicar nuevos anuncios.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:flex-1">
                      <SelectField label="Vivienda" value={viviendaSel}
                        onChange={(e) => setViviendaSel(e.target.value)}>
                        {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </SelectField>
                    </div>
                    <Button variant="danger-outline"
                      onClick={() => alternarBloqueo(viviendaSel, true)}>
                      <Lock size={16} /> Bloquear
                    </Button>
                  </div>

                  <div className="mt-4">
                    <h3 className="overline mb-2">Viviendas bloqueadas</h3>
                    {bloqueadas.state === 'loading' && <SkeletonList n={2} />}
                    {bloqueadas.state === 'error' && <ErrorState onRetry={bloqueadas.refetch} />}
                    {bloqueadas.state === 'empty' && (
                      <p className="text-[13px] text-faint">Ninguna vivienda bloqueada.</p>
                    )}
                    {bloqueadas.state === 'ready' && bloqueadas.data && (
                      <ul className="flex flex-col gap-2">
                        {bloqueadas.data.map((v) => (
                          <li key={v} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-2 px-3.5 py-2.5">
                            <span className="text-[14px] font-semibold text-ink">{v}</span>
                            <Button variant="ghost" onClick={() => alternarBloqueo(v, false)}>
                              <Unlock size={16} /> Desbloquear
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
