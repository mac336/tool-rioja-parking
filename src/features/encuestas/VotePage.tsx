import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Info, Lock, Check } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Alert, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { getEncuesta, votarPregunta } from '@/lib/api'
import { useApp } from '@/store'
import { esTester, puedeVotar } from '@/lib/roles'
import type { EncuestaPregunta } from '@/types'

export function VotePage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { user, toast } = useApp()
  const tester = esTester(user.rol)
  const noPuedeVotar = !puedeVotar(user.rol)
  const { data, state, refetch } = useAsync(() => getEncuesta(id), [id])

  // selección local por pregunta: { [preguntaId]: opcionId[] }
  const [sel, setSel] = useState<Record<string, string[]>>({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (data) setSel(Object.fromEntries(data.preguntas.map((p) => [p.id, p.mi_voto_opcion_ids])))
  }, [data])

  const toggle = (q: EncuestaPregunta, opcionId: string) => {
    setSel((prev) => {
      const actual = prev[q.id] ?? []
      if (q.tipo === 'opcion_unica') return { ...prev, [q.id]: [opcionId] }
      return { ...prev, [q.id]: actual.includes(opcionId) ? actual.filter((x) => x !== opcionId) : [...actual, opcionId] }
    })
  }

  const confirmar = async () => {
    if (!data) return
    setEnviando(true)
    for (const q of data.preguntas) await votarPregunta(data.id, q.id, sel[q.id] ?? [])
    toast('Voto registrado')
    nav(`/votaciones/${data.id}/resultados`)
  }

  const algunaMarcada = data ? data.preguntas.some((p) => (sel[p.id] ?? []).length > 0) : false

  return (
    <div>
      <SubHeader titulo="Votación" />
      <Page className="flex flex-col gap-4">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {!data && state !== 'loading' && <Alert tipo="warn">No hemos encontrado esta votación.</Alert>}

        {data && data.estado !== 'abierta' && (
          <>
            <Alert tipo="info">Esta votación no está abierta. Puedes consultar los resultados.</Alert>
            <Link to={`/votaciones/${data.id}/resultados`}><Button block>Ver resultados</Button></Link>
          </>
        )}

        {data && data.estado === 'abierta' && (
          <>
            <div>
              <h1 className="font-display text-[24px] font-extrabold text-ink">{data.titulo}</h1>
              {data.descripcion && <p className="mt-1 text-[14px] text-muted">{data.descripcion}</p>}
              <p className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-muted">
                <Info size={13} /> Sondeo informal · un voto por vivienda, editable hasta el cierre.
              </p>
            </div>

            {data.preguntas.map((q, qi) => (
              <Card key={q.id} className="flex flex-col gap-3">
                {data.formato === 'multi' && (
                  <h2 className="font-display text-[16px] font-bold text-ink">{qi + 1}. {q.texto}</h2>
                )}
                {q.tipo === 'opcion_multiple' && <div className="text-[12px] text-faint">Puedes marcar varias.</div>}
                <div className="flex flex-col gap-2.5">
                  {q.opciones.map((o) => {
                    const activa = (sel[q.id] ?? []).includes(o.id)
                    return (
                      <button key={o.id} type="button" onClick={() => toggle(q, o.id)}
                        className={cx('flex items-center gap-3 rounded-[14px] p-3.5 text-left transition-shadow',
                          activa ? 'bg-primary-soft shadow-neu-inset' : 'bg-surface shadow-neu-sm')}>
                        <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center border-2 border-primary',
                          q.tipo === 'opcion_unica' ? 'rounded-full' : 'rounded-[7px]',
                          activa ? 'bg-primary text-white' : 'bg-transparent')}>
                          {activa && <Check size={15} strokeWidth={3} />}
                        </span>
                        <span className="text-[15px] font-semibold text-ink">{o.texto}</span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            ))}

            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
              <Lock size={13} /> Voto verificado
            </div>
            {tester
              ? <div className="mb-2"><Alert tipo="info">Cuenta de pruebas (Tester): solo lectura. Puedes mirarlo todo y chatear por el buzón, pero no realizar acciones.</Alert></div>
              : noPuedeVotar && <div className="mb-2"><Alert tipo="warn">Tu rol no tiene permiso para votar en encuestas.</Alert></div>}
            <Button block size="lg" disabled={noPuedeVotar || !algunaMarcada || enviando} onClick={confirmar}>
              {enviando ? 'Registrando…' : 'Confirmar mi voto'}
            </Button>
          </>
        )}
      </Page>
    </div>
  )
}
