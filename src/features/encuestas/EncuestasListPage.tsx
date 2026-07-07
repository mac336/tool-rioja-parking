import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { listEncuestas } from '@/lib/api'
import { diasRestantes } from '@/lib/format'
import { Card, ProgressBar, Button, EmptyState, ErrorState, SkeletonList } from '@/components/ui'
import type { Encuesta } from '@/types'

/** Etiqueta obligatoria: las encuestas son sondeos informales, sin valor oficial. */
function SondeoInformal() {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
      <Info size={13} /> Sondeo informal, sin valor oficial
    </span>
  )
}

function VotacionAbierta({ e }: { e: Encuesta }) {
  const yaVoto = e.mi_voto_opcion_ids.length > 0
  return (
    <Card className="border-primary border-2">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-info">
        <span className="h-2 w-2 rounded-full bg-info" /> Votación abierta
      </div>
      <h3 className="mt-1.5 font-display text-[19px] font-bold text-ink">{e.titulo}</h3>
      <p className="mt-0.5 text-[13px] text-muted">Cierra en {diasRestantes(e.cierre)} días</p>

      <div className="mt-3">
        <ProgressBar value={e.viviendas_votantes} max={e.total_viviendas} />
        <p className="mt-1.5 text-[12px] text-muted">{e.viviendas_votantes}/{e.total_viviendas} viviendas</p>
      </div>

      <div className="mt-3">
        {yaVoto
          ? <Button variant="secondary" block disabled>Ya votaste ✓</Button>
          : <Link to={`/votaciones/${e.id}`}><Button block>Votar ahora</Button></Link>}
      </div>
      <div className="mt-3"><SondeoInformal /></div>
    </Card>
  )
}

export function EncuestasListPage() {
  const { data, state, refetch } = useAsync(listEncuestas, [])

  const abiertas = data?.filter((e) => e.estado === 'abierta') ?? []
  const cerradas = data?.filter((e) => e.estado === 'cerrada') ?? []
  const programadas = data?.filter((e) => e.estado === 'programada') ?? []

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur safe-top">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Votaciones</h1>
      </header>

      <div className="px-4 py-4">
        {state === 'loading' && <SkeletonList />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'empty' && <EmptyState titulo="Sin votaciones" texto="Aún no hay votaciones." />}

        {state === 'ready' && (
          <div className="flex flex-col gap-5">
            {abiertas.length > 0 && (
              <section className="flex flex-col gap-3">
                {abiertas.map((e) => <VotacionAbierta key={e.id} e={e} />)}
              </section>
            )}

            {programadas.length > 0 && (
              <section>
                <h2 className="overline mb-2">Próximamente</h2>
                <div className="flex flex-col gap-2">
                  {programadas.map((e) => (
                    <Card key={e.id} className="opacity-80">
                      <div className="text-[15px] font-semibold text-ink">{e.titulo}</div>
                      <div className="mt-0.5 text-[12px] text-muted">Abre en {diasRestantes(e.apertura)} días</div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {cerradas.length > 0 && (
              <section>
                <h2 className="overline mb-2">Cerradas</h2>
                <div className="flex flex-col gap-2">
                  {cerradas.map((e) => (
                    <Link key={e.id} to={`/votaciones/${e.id}/resultados`} className="block">
                      <Card className="flex items-center justify-between gap-3 hover:bg-surface-2">
                        <div>
                          <div className="text-[15px] font-semibold text-ink">{e.titulo}</div>
                          <div className="mt-0.5 text-[12px] text-muted">Cerrada · Ver resultados</div>
                        </div>
                        <span className="text-primary" aria-hidden>›</span>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
