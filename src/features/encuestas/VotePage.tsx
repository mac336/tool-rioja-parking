import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Info, Lock, Check } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Alert, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { getEncuesta, votar } from '@/lib/api'
import { useApp } from '@/store'

function SondeoInformal() {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
      <Info size={13} /> Sondeo informal, sin valor oficial
    </span>
  )
}

export function VotePage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { toast } = useApp()
  const { data, state, refetch } = useAsync(() => getEncuesta(id), [id])

  const [seleccion, setSeleccion] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (data) setSeleccion(data.mi_voto_opcion_ids)
  }, [data])

  const toggle = (opcionId: string) => {
    if (!data) return
    if (data.tipo === 'opcion_unica') {
      setSeleccion([opcionId])
    } else {
      setSeleccion((prev) =>
        prev.includes(opcionId) ? prev.filter((x) => x !== opcionId) : [...prev, opcionId])
    }
  }

  const confirmar = async () => {
    if (!data) return
    setEnviando(true)
    await votar(data.id, seleccion)
    toast('Voto registrado')
    nav(`/votaciones/${data.id}/resultados`)
  }

  return (
    <div>
      <SubHeader titulo="Votación" />
      <Page>
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'ready' || state === 'empty') && !data && (
          <Alert tipo="warn">No hemos encontrado esta votación.</Alert>
        )}

        {data && data.estado !== 'abierta' && (
          <div className="flex flex-col gap-4">
            <Alert tipo="info">Esta votación no está abierta. Puedes consultar los resultados.</Alert>
            <Link to={`/votaciones/${data.id}/resultados`}><Button block>Ver resultados</Button></Link>
          </div>
        )}

        {data && data.estado === 'abierta' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-[24px] font-extrabold text-ink">{data.titulo}</h1>
              {data.descripcion && <p className="mt-1 text-[14px] text-muted">{data.descripcion}</p>}
              <p className="mt-2 text-[13px] text-muted">Un voto por vivienda, editable hasta el cierre.</p>
              <div className="mt-1.5"><SondeoInformal /></div>
            </div>

            <div className="flex flex-col gap-2.5">
              {[...data.opciones].sort((a, b) => a.orden - b.orden).map((o) => {
                const activa = seleccion.includes(o.id)
                return (
                  <button key={o.id} type="button" onClick={() => toggle(o.id)}
                    className={cx('flex items-center gap-3 rounded-[16px] border bg-surface p-4 text-left transition-colors',
                      activa ? 'border-primary border-2 bg-primary-soft' : 'border-border-strong hover:bg-surface-2')}>
                    <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center border-2 border-primary text-white',
                      data.tipo === 'opcion_unica' ? 'rounded-full' : 'rounded-[7px]',
                      activa ? 'bg-primary' : 'bg-transparent')}>
                      {activa && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="text-[16px] font-semibold text-ink">{o.texto}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
              <Lock size={13} /> Voto verificado
            </div>

            <Button block size="lg" disabled={seleccion.length === 0 || enviando} onClick={confirmar}>
              {enviando ? 'Registrando…' : 'Confirmar mi voto'}
            </Button>
          </div>
        )}
      </Page>
    </div>
  )
}
