import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ListChecks, CheckCircle2, Lock, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Button, Card, ProgressBar, Alert, EmptyState, ErrorState, SkeletonList, ScreenHeader, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { diasRestantes } from '@/lib/format'
import { esGestion } from '@/lib/roles'
import { useApp } from '@/store'
import { listEncuestas, cerrarEncuesta, borrarEncuesta } from '@/lib/api'
import type { Encuesta } from '@/types'

const haVotado = (e: Encuesta) => e.preguntas.some((p) => p.mi_voto_opcion_ids.length > 0)
const votadaEntera = (e: Encuesta) => e.preguntas.every((p) => p.mi_voto_opcion_ids.length > 0)

export function EncuestasListPage() {
  const { user, toast } = useApp()
  const { data, state, refetch } = useAsync(listEncuestas, [], { key: 'encuestas', ttlMs: TTL.encuestas })
  const gestion = esGestion(user.rol)
  const [busyId, setBusyId] = useState<string | null>(null)

  const abiertas = data?.filter((e) => e.estado === 'abierta') ?? []
  const cerradas = data?.filter((e) => e.estado === 'cerrada') ?? []

  const cerrar = async (e: Encuesta) => {
    if (!window.confirm(`¿Cerrar la votación "${e.titulo}"? No se admitirán más votos.`)) return
    setBusyId(e.id)
    try {
      await cerrarEncuesta(e.id)
      await refetch()
      toast('Votación cerrada')
    } catch {
      toast('No se pudo cerrar la votación', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const borrar = async (e: Encuesta) => {
    if (!window.confirm(`¿Eliminar la votación "${e.titulo}"? Esta acción no se puede deshacer.`)) return
    setBusyId(e.id)
    try {
      await borrarEncuesta(e.id)
      await refetch()
      toast('Votación eliminada')
    } catch {
      toast('No se pudo eliminar la votación', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <ScreenHeader title="Votaciones" />
      <Page className="flex flex-col gap-4">
        {gestion && (
          <Link to="/votaciones/nueva" className="block">
            <Button block size="lg"><Plus size={18} /> Crear votación</Button>
          </Link>
        )}

        <Alert tipo="info">Sondeos informales, sin valor oficial · un voto por vivienda.</Alert>

        {state === 'loading' && <SkeletonList />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {data && data.length === 0 && <EmptyState titulo="Sin votaciones" texto="Aún no hay votaciones abiertas." />}

        {abiertas.map((e) => {
          const votada = haVotado(e)
          return (
            <Card key={e.id} className={cx(votada ? '' : 'ring-2 ring-primary')}>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-info">
                <span className="h-2 w-2 rounded-full bg-info" /> Votación abierta
              </div>
              <h2 className="mt-1 font-display text-[17px] font-bold text-ink">{e.titulo}</h2>
              <div className="mt-0.5 text-[12px] text-muted">
                {e.formato === 'multi' ? `${e.preguntas.length} preguntas` : '1 pregunta'} · cierra en {diasRestantes(e.cierre)} días
              </div>
              <div className="mt-3">
                <ProgressBar value={e.viviendas_votantes} max={e.total_viviendas} />
                <div className="mt-1 text-[12px] text-faint">{e.viviendas_votantes}/{e.total_viviendas} viviendas han participado</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/votaciones/${e.id}`} className="flex-1">
                  <Button block variant={votada ? 'secondary' : 'primary'}>
                    {votadaEntera(e) ? <><CheckCircle2 size={17} /> Editar mi voto</> : votada ? 'Continuar votando' : 'Votar ahora'}
                  </Button>
                </Link>
                <Link to={`/votaciones/${e.id}/resultados`}><Button variant="ghost">Resultados</Button></Link>
              </div>
              {gestion && (
                <div className="mt-3 flex items-center gap-1 border-t border-border pt-2 text-[13px]">
                  <span className="mr-auto font-semibold text-faint">Gestión</span>
                  <button type="button" onClick={() => cerrar(e)} disabled={busyId === e.id}
                    className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-semibold text-muted transition-colors hover:bg-surface-2 disabled:opacity-50">
                    <Lock size={14} /> Cerrar
                  </button>
                  <button type="button" onClick={() => borrar(e)} disabled={busyId === e.id}
                    className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50">
                    <Trash2 size={14} /> Borrar
                  </button>
                </div>
              )}
            </Card>
          )
        })}

        {cerradas.length > 0 && (
          <section>
            <h2 className="section-title mb-2 flex items-center gap-1.5"><ListChecks size={14} /> Cerradas</h2>
            <div className="flex flex-col gap-3">
              {cerradas.map((e) => (
                <Card key={e.id} className="flex items-center justify-between gap-2">
                  <Link to={`/votaciones/${e.id}/resultados`} className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{e.titulo}</div>
                    <div className="text-[12px] text-muted">Cerrada · {e.viviendas_votantes}/{e.total_viviendas} viviendas</div>
                  </Link>
                  {gestion ? (
                    <button type="button" onClick={() => borrar(e)} disabled={busyId === e.id}
                      aria-label="Borrar votación"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50">
                      <Trash2 size={14} /> Borrar
                    </button>
                  ) : (
                    <span className="shrink-0 text-[13px] font-semibold text-primary-700">Ver resultados →</span>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </Page>
    </div>
  )
}
