import { Link, useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, Button, Alert, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { getEncuesta } from '@/lib/api'

function SondeoInformal() {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
      <Info size={13} /> Sondeo informal, sin valor oficial
    </span>
  )
}

function Resumen({ valor, label }: { valor: string; label: string }) {
  return (
    <Card className="flex flex-col items-center gap-0.5 text-center">
      <span className="font-display text-[24px] font-extrabold text-ink">{valor}</span>
      <span className="text-[12px] text-muted">{label}</span>
    </Card>
  )
}

export function ResultsPage() {
  const { id = '' } = useParams()
  const { data, state, refetch } = useAsync(() => getEncuesta(id), [id])

  return (
    <div>
      <SubHeader titulo="Resultados" />
      <Page>
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'ready' || state === 'empty') && !data && (
          <Alert tipo="warn">No hemos encontrado esta votación.</Alert>
        )}

        {data && (() => {
          const opciones = [...data.opciones].sort((a, b) => a.orden - b.orden)
          const totalVotos = opciones.reduce((s, o) => s + o.votos, 0)
          const maxVotos = Math.max(0, ...opciones.map((o) => o.votos))
          const participacion = data.total_viviendas > 0
            ? Math.round((data.viviendas_votantes / data.total_viviendas) * 100) : 0
          const yaVoto = data.mi_voto_opcion_ids.length > 0

          return (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="font-display text-[24px] font-extrabold text-ink">{data.titulo}</h1>
                {data.descripcion && <p className="mt-1 text-[14px] text-muted">{data.descripcion}</p>}
                <div className="mt-1.5"><SondeoInformal /></div>
              </div>

              {yaVoto && <Alert tipo="success">Tu voto fue registrado.</Alert>}

              <div className="grid grid-cols-3 gap-3">
                <Resumen valor={String(totalVotos)} label="Votos totales" />
                <Resumen valor={`${participacion}%`} label="Participación" />
                <Resumen valor={data.estado === 'cerrada' ? 'Cerrada' : 'Abierta'} label="Estado" />
              </div>

              <div className="flex flex-col gap-3">
                {opciones.map((o) => {
                  const pct = totalVotos > 0 ? Math.round((o.votos / totalVotos) * 100) : 0
                  const esMasVotada = o.votos > 0 && o.votos === maxVotos
                  const elegida = data.mi_voto_opcion_ids.includes(o.id)
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={cx('text-[15px] text-ink', elegida ? 'font-bold' : 'font-medium')}>
                          {o.texto}
                          {elegida && <span className="ml-1.5 text-[12px] font-semibold text-primary">· tu voto</span>}
                        </span>
                        <span className="flex items-center gap-2">
                          {esMasVotada && (
                            <span className="rounded-pill bg-primary px-2 py-0.5 text-[11px] font-bold text-white">Más votada</span>
                          )}
                          <span className="text-[13px] font-semibold text-muted">{pct}% · {o.votos}</span>
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-pill bg-surface-2">
                        <div className={cx('h-full rounded-pill transition-all', esMasVotada ? 'bg-primary' : 'bg-primary/50')}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-[12px] text-muted">{data.viviendas_votantes}/{data.total_viviendas} viviendas han votado.</p>

              {data.estado === 'abierta' && data.mi_voto_opcion_ids.length === 0 && (
                <Link to={`/votaciones/${data.id}`}><Button block>Votar ahora</Button></Link>
              )}
            </div>
          )
        })()}
      </Page>
    </div>
  )
}
