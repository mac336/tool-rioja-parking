import { Link, useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, Button, Alert, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { getEncuesta } from '@/lib/api'
import { JuntaVote } from './JuntaVote'
import type { EncuestaPregunta } from '@/types'

function Resumen({ valor, label }: { valor: string; label: string }) {
  return (
    <Card className="flex flex-col items-center gap-0.5 text-center">
      <span className="font-display text-[22px] font-extrabold text-ink">{valor}</span>
      <span className="text-[12px] text-muted">{label}</span>
    </Card>
  )
}

function PreguntaResultado({ q, numero, formato }: { q: EncuestaPregunta; numero: number; formato: string }) {
  const total = q.opciones.reduce((s, o) => s + o.votos, 0)
  const max = Math.max(0, ...q.opciones.map((o) => o.votos))
  return (
    <Card className="flex flex-col gap-3">
      {formato === 'multi' && <h2 className="font-display text-[16px] font-bold text-ink">{numero}. {q.texto}</h2>}
      {q.opciones.map((o) => {
        const pct = total > 0 ? Math.round((o.votos / total) * 100) : 0
        const gana = o.votos > 0 && o.votos === max
        const elegida = q.mi_voto_opcion_ids.includes(o.id)
        return (
          <div key={o.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={cx('text-[15px] text-ink', elegida ? 'font-bold' : 'font-medium')}>
                {o.texto}
                {elegida && <span className="ml-1.5 text-[12px] font-semibold text-primary">· tu voto</span>}
              </span>
              <span className="flex items-center gap-2">
                {gana && <span className="rounded-pill bg-primary px-2 py-0.5 text-[11px] font-bold text-white">Más votada</span>}
                <span className="text-[13px] font-semibold text-muted">{pct}% · {o.votos}</span>
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-pill bg-surface-2">
              <div className={cx('h-full rounded-pill transition-all', gana ? 'bg-primary' : 'bg-primary/50')} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

export function ResultsPage() {
  const { id = '' } = useParams()
  const { data, state, refetch } = useAsync(() => getEncuesta(id), [id])

  return (
    <div>
      <SubHeader titulo="Resultados" />
      <Page className="flex flex-col gap-4">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {!data && state !== 'loading' && <Alert tipo="warn">No hemos encontrado esta votación.</Alert>}

        {data && data.es_junta && <JuntaVote encuesta={data} onVotado={refetch} />}

        {data && !data.es_junta && (
          <>
            <div>
              <h1 className="font-display text-[24px] font-extrabold text-ink">{data.titulo}</h1>
              {data.descripcion && <p className="mt-1 text-[14px] text-muted">{data.descripcion}</p>}
              <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-muted">
                <Info size={13} /> Sondeo informal, sin valor oficial
              </p>
            </div>

            {data.preguntas.some((p) => p.mi_voto_opcion_ids.length > 0) && (
              <Alert tipo="success">Tu voto fue registrado.</Alert>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Resumen valor={`${data.preguntas.length}`} label={data.formato === 'multi' ? 'Preguntas' : 'Pregunta'} />
              <Resumen valor={`${data.total_viviendas > 0 ? Math.round((data.viviendas_votantes / data.total_viviendas) * 100) : 0}%`} label="Participación" />
              <Resumen valor={data.estado === 'cerrada' ? 'Cerrada' : 'Abierta'} label="Estado" />
            </div>

            {data.preguntas.map((q, i) => (
              <PreguntaResultado key={q.id} q={q} numero={i + 1} formato={data.formato} />
            ))}

            <p className="text-[12px] text-muted">{data.viviendas_votantes}/{data.total_viviendas} viviendas han participado.</p>

            {data.estado === 'abierta' && (
              <Link to={`/votaciones/${data.id}`}><Button block variant="secondary">Ir a votar / editar mi voto</Button></Link>
            )}
          </>
        )}
      </Page>
    </div>
  )
}
