import { useEffect, useState } from 'react'
import { Info, Check, X, Gavel, Building2, ShieldCheck } from 'lucide-react'
import { Card, Button, Alert, SkeletonList, cx } from '@/components/ui'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { esTester, puedeVotar } from '@/lib/roles'
import { getJuntaParticipacion, setJuntaParticipacion, votarPregunta, juntaResultados, juntaDetalleReal, juntaParticipantes } from '@/lib/api'
import type { Encuesta } from '@/types'

// Un voto es REAL si NO asiste a la junta y SÍ quiere votar por la app.
const esReal = (asiste: boolean | null, votaApp: boolean | null) => asiste === false && votaApp === true

export function JuntaVote({ encuesta, onVotado }: { encuesta: Encuesta; onVotado: () => void }) {
  const { user, toast } = useApp()
  const tester = esTester(user.rol)
  const noPuedeVotar = !puedeVotar(user.rol)
  const esAdmin = user.rol === 'administrador_finca' || user.rol === 'app_admin'
  const abierta = encuesta.estado === 'abierta'

  const [asiste, setAsiste] = useState<boolean | null>(null)
  const [votaApp, setVotaApp] = useState<boolean | null>(null)
  const [sel, setSel] = useState<Record<string, string>>({}) // punto_id → opcion_id
  const [guardando, setGuardando] = useState(false)

  // Participación previa + voto previo (para reanudar).
  const part = useAsync(() => getJuntaParticipacion(encuesta.id), [encuesta.id])
  useEffect(() => {
    if (part.data) { setAsiste(part.data.asiste); setVotaApp(part.data.asiste ? false : part.data.vota_app) }
  }, [part.data])
  useEffect(() => {
    const s: Record<string, string> = {}
    for (const p of encuesta.preguntas) if (p.mi_voto_opcion_ids[0]) s[p.id] = p.mi_voto_opcion_ids[0]
    setSel(s)
  }, [encuesta])

  const resultados = useAsync(() => juntaResultados(encuesta.id), [encuesta.id])
  const detalle = useAsync(() => (esAdmin ? juntaDetalleReal(encuesta.id) : Promise.resolve([])), [encuesta.id, esAdmin])
  const participantes = useAsync(() => (esAdmin ? juntaParticipantes(encuesta.id) : Promise.resolve([])), [encuesta.id, esAdmin])

  const participacionOk = asiste === true || (asiste === false && votaApp !== null)
  const real = esReal(asiste, votaApp)
  const opcionDe = (punto: Encuesta['preguntas'][number], texto: string) =>
    punto.opciones.find((o) => o.texto.toLowerCase() === texto)?.id ?? ''
  const todosVotados = encuesta.preguntas.every((p) => sel[p.id])

  async function guardar() {
    if (!participacionOk || guardando) return
    setGuardando(true)
    try {
      await setJuntaParticipacion(encuesta.id, asiste === true, asiste ? false : !!votaApp)
      for (const p of encuesta.preguntas) if (sel[p.id]) await votarPregunta(encuesta.id, p.id, [sel[p.id]])
      toast(real ? 'Voto real registrado' : 'Voto de sondeo registrado', 'ok')
      resultados.refetch(); detalle.refetch(); participantes.refetch(); onVotado()
    } catch { toast('No se pudo registrar el voto', 'error') } finally { setGuardando(false) }
  }

  // Detalle real por piso → mapa vivienda → { punto_texto: voto }
  const realesPorPiso = new Map<string, { punto: string; voto: string }[]>()
  for (const f of detalle.data ?? []) {
    const arr = realesPorPiso.get(f.vivienda) ?? []
    arr.push({ punto: f.punto_texto, voto: f.voto })
    realesPorPiso.set(f.vivienda, arr)
  }
  const nReales = (participantes.data ?? []).filter((p) => p.es_real).length
  const nAsisten = (participantes.data ?? []).filter((p) => p.asiste).length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-primary"><Gavel size={18} /><span className="overline text-primary">Votación de junta</span></div>
        <h1 className="mt-1 font-display text-[24px] font-extrabold text-ink">{encuesta.titulo}</h1>
        {encuesta.descripcion && <p className="mt-1 text-[14px] text-muted">{encuesta.descripcion}</p>}
      </div>

      {abierta && !tester && !noPuedeVotar && (
        <>
          {/* Paso 1: participación */}
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-[16px] font-bold text-ink">¿Asistirás a la junta de vecinos?</h2>
            <div className="grid grid-cols-2 gap-2">
              <SiNo activo={asiste === true} onClick={() => { setAsiste(true); setVotaApp(false) }} label="Sí, asistiré" />
              <SiNo activo={asiste === false} onClick={() => { setAsiste(false); setVotaApp(null) }} label="No asistiré" />
            </div>

            {asiste === false && (
              <>
                <h2 className="mt-1 font-display text-[16px] font-bold text-ink">¿Quieres votar desde la aplicación?</h2>
                <div className="grid grid-cols-2 gap-2">
                  <SiNo activo={votaApp === true} onClick={() => setVotaApp(true)} label="Sí, quiero votar" />
                  <SiNo activo={votaApp === false} onClick={() => setVotaApp(false)} label="No, solo mirar" />
                </div>
              </>
            )}

            {participacionOk && (
              real
                ? <Alert tipo="success">Tu voto será <b>REAL</b>: se trasladará al conteo de la junta.</Alert>
                : <Alert tipo="info">{asiste ? 'Como asistirás a la junta, votarás en persona.' : 'Has elegido no votar por la app.'} Lo que marques aquí cuenta solo como <b>sondeo</b> de vecinos.</Alert>
            )}
          </Card>

          {/* Paso 2: puntos */}
          {participacionOk && encuesta.preguntas.map((p, i) => (
            <Card key={p.id} className="flex flex-col gap-2.5">
              <h3 className="font-display text-[15px] font-bold text-ink">{i + 1}. {p.texto}</h3>
              <div className="grid grid-cols-2 gap-2">
                {(['aprobar', 'rechazar'] as const).map((val) => {
                  const oid = opcionDe(p, val)
                  const activo = sel[p.id] === oid
                  const aprob = val === 'aprobar'
                  return (
                    <button key={val} type="button" onClick={() => setSel((s) => ({ ...s, [p.id]: oid }))}
                      className={cx('flex items-center justify-center gap-1.5 rounded-[12px] border py-3 text-[14px] font-bold transition-colors',
                        activo ? 'text-white' : 'border-border bg-surface-2 text-muted')}
                      style={activo ? { background: aprob ? 'var(--success)' : 'var(--danger)', borderColor: aprob ? 'var(--success)' : 'var(--danger)' } : undefined}>
                      {aprob ? <Check size={16} /> : <X size={16} />} {aprob ? 'Aprobar' : 'Rechazar'}
                    </button>
                  )
                })}
              </div>
            </Card>
          ))}

          {participacionOk && (
            <Button block size="lg" disabled={!todosVotados || guardando} onClick={guardar}>
              {guardando ? 'Registrando…' : 'Confirmar mi voto'}
            </Button>
          )}
        </>
      )}

      {tester && <Alert tipo="info">Cuenta de pruebas (Tester): solo lectura.</Alert>}
      {!tester && noPuedeVotar && abierta && <Alert tipo="warn">Tu rol no tiene permiso para votar.</Alert>}
      {!abierta && <Alert tipo="info">Esta votación no está abierta. Puedes consultar los resultados.</Alert>}

      {/* Resultados generales (todos): sondeo + reales, anónimo */}
      <section>
        <h2 className="section-title mb-2">Resultados (sondeo + reales)</h2>
        {resultados.state === 'loading' ? <SkeletonList n={2} /> : (
          <div className="flex flex-col gap-2.5">
            {(resultados.data ?? []).map((r) => {
              const total = r.aprobar + r.rechazar
              const pct = total > 0 ? Math.round((r.aprobar / total) * 100) : 0
              return (
                <Card key={r.punto_id} className="flex flex-col gap-1.5">
                  <div className="text-[14px] font-semibold text-ink">{r.punto_texto}</div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div style={{ width: `${pct}%`, background: 'var(--success)' }} />
                    <div style={{ width: `${100 - pct}%`, background: 'var(--danger)' }} />
                  </div>
                  <div className="flex justify-between text-[12.5px] font-semibold">
                    <span className="text-success-ink">Aprobar {r.aprobar}</span>
                    <span className="text-danger-ink">Rechazar {r.rechazar}</span>
                  </div>
                </Card>
              )
            })}
            {(resultados.data ?? []).length === 0 && <p className="text-[13px] text-muted">Aún no hay votos.</p>}
          </div>
        )}
      </section>

      {/* Detalle REAL por piso (solo administrador de finca + app_admin) */}
      {esAdmin && (
        <section>
          <h2 className="section-title mb-2 flex items-center gap-1.5"><ShieldCheck size={15} /> Votos reales por piso (solo administración)</h2>
          <p className="mb-2 text-[12px] text-faint">{nReales} {nReales === 1 ? 'piso vota' : 'pisos votan'} en real · {nAsisten} {nAsisten === 1 ? 'asistirá' : 'asistirán'} a la junta.</p>
          {detalle.state === 'loading' ? <SkeletonList n={1} /> : realesPorPiso.size === 0 ? (
            <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-muted">Todavía no hay votos reales (solo cuentan quienes no asisten y votan por la app).</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...realesPorPiso.entries()].map(([viv, votos]) => (
                <Card key={viv} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-display text-[15px] font-bold text-ink"><Building2 size={15} /> {viv}</div>
                  {votos.map((v, k) => (
                    <div key={k} className="flex items-center justify-between text-[13px]">
                      <span className="text-muted">{v.punto}</span>
                      <span className={cx('font-bold', v.voto.toLowerCase() === 'aprobar' ? 'text-success-ink' : 'text-danger-ink')}>{v.voto}</span>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          )}
          <p className="mt-2 flex items-center gap-1 text-[11.5px] text-faint"><Info size={12} /> Solo tú (y el admin de la app) veis este detalle; los vecinos ven solo los totales.</p>
        </section>
      )}
    </div>
  )
}

function SiNo({ activo, onClick, label }: { activo: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('rounded-[12px] border py-3 text-[14px] font-bold transition-colors',
        activo ? 'border-primary bg-primary text-white' : 'border-border bg-surface-2 text-muted')}>
      {label}
    </button>
  )
}
