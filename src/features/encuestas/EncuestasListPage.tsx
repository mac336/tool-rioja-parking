import { Link } from 'react-router-dom'
import { Plus, ListChecks, CheckCircle2 } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Button, Card, ProgressBar, Alert, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { diasRestantes } from '@/lib/format'
import { esGestion } from '@/lib/roles'
import { useApp } from '@/store'
import { listEncuestas } from '@/lib/api'
import type { Encuesta } from '@/types'

const haVotado = (e: Encuesta) => e.preguntas.some((p) => p.mi_voto_opcion_ids.length > 0)
const votadaEntera = (e: Encuesta) => e.preguntas.every((p) => p.mi_voto_opcion_ids.length > 0)

export function EncuestasListPage() {
  const { user } = useApp()
  const { data, state, refetch } = useAsync(listEncuestas, [])
  const gestion = esGestion(user.rol)

  const abiertas = data?.filter((e) => e.estado === 'abierta') ?? []
  const cerradas = data?.filter((e) => e.estado === 'cerrada') ?? []

  return (
    <div>
      <header className="border-b border-border bg-surface px-4 pb-3 pt-5">
        <h1 className="font-display text-[26px] font-extrabold text-ink">Votaciones</h1>
      </header>
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
            </Card>
          )
        })}

        {cerradas.length > 0 && (
          <section>
            <h2 className="overline mb-2 flex items-center gap-1.5"><ListChecks size={14} /> Cerradas</h2>
            <div className="flex flex-col gap-3">
              {cerradas.map((e) => (
                <Link key={e.id} to={`/votaciones/${e.id}/resultados`} className="block">
                  <Card className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink">{e.titulo}</div>
                      <div className="text-[12px] text-muted">Cerrada · {e.viviendas_votantes}/{e.total_viviendas} viviendas</div>
                    </div>
                    <span className="text-[13px] font-semibold text-primary-700">Ver resultados →</span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Page>
    </div>
  )
}
