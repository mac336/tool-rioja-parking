import { useState } from 'react'
import { SquareParking, CalendarClock, ArrowLeftRight } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Card, SelectField, Field, Textarea, Button, Alert, cx } from '@/components/ui'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { rangoFechas } from '@/lib/format'
import { parkingMisTurnos, parkingProximas, crearCesion, demandaParking } from '@/lib/api'
import type { CesionTipo } from '@/types'

const TIPO_LABEL: { value: CesionTipo; label: string }[] = [
  { value: 'cede', label: 'Cedo mi plaza' },
  { value: 'no_necesita', label: 'No la necesito' },
  { value: 'necesita', label: 'Necesito plaza' },
]

export function ParkingPage() {
  const { user, toast } = useApp()
  const misTurnos = useAsync(parkingMisTurnos, [user.vivienda])
  const proximas = useAsync(() => parkingProximas(5), [])
  const demanda = useAsync(demandaParking, [])

  const actual = misTurnos.data?.find((t) => t.actual)
  const futuros = misTurnos.data?.filter((t) => !t.actual) ?? []

  const [tipo, setTipo] = useState<CesionTipo>('cede')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const valido = Boolean(desde && hasta && desde <= hasta)

  const enviar = async () => {
    if (!valido) return
    setEnviando(true)
    try {
      await crearCesion({ tipo, desde, hasta, nota: nota.trim() || undefined })
      toast('Aviso enviado a la gestión')
      setDesde('')
      setHasta('')
      setNota('')
      demanda.refetch()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <header className="border-b border-border bg-surface px-4 pb-3 pt-5">
        <h1 className="font-display text-[26px] font-extrabold text-ink">Parking</h1>
      </header>

      <Page className="flex flex-col gap-5">
        {/* Plaza de esta quincena */}
        <div className="rounded-[18px] p-5 text-white shadow-neu" style={{ background: 'var(--grad-hero)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              {actual ? (
                <>
                  <div className="overline text-white/70">Esta quincena · te toca la</div>
                  <div className="mt-1 font-display text-[30px] font-extrabold leading-tight">Plaza {actual.plaza}</div>
                  <div className="mt-1 text-[14px] text-white/85">{rangoFechas(actual.inicio, actual.fin)}</div>
                </>
              ) : (
                <>
                  <div className="overline text-white/70">Esta quincena</div>
                  <div className="mt-1 font-display text-[22px] font-bold leading-tight">No te toca plaza</div>
                  <div className="mt-1 text-[14px] text-white/85">Mira abajo tus próximos turnos.</div>
                </>
              )}
            </div>
            <SquareParking size={44} className="shrink-0 text-white/40" />
          </div>
        </div>

        {/* Mis próximos turnos */}
        <section>
          <h2 className="overline mb-2 flex items-center gap-1.5"><CalendarClock size={14} /> Mis próximos turnos</h2>
          {futuros.length === 0 ? (
            <Card className="text-[14px] text-muted">No hay turnos próximos calculados.</Card>
          ) : (
            <div className="flex flex-col gap-2">
              {futuros.map((t) => (
                <Card key={t.quincena} className="flex items-center justify-between py-3">
                  <span className="text-[14px] text-ink">{rangoFechas(t.inicio, t.fin)}</span>
                  <span className="text-[14px] font-bold text-primary-700">Plaza {t.plaza}</span>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Próximas quincenas · 6 plazas */}
        <section>
          <h2 className="overline mb-2">Próximas quincenas · 6 plazas</h2>
          <div className="min-w-0 max-w-full overflow-x-auto rounded-[16px] border border-border bg-surface">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Quincena</th>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="whitespace-nowrap px-3 py-2.5 text-center font-semibold">Plaza {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(proximas.data ?? []).map((q) => (
                  <tr key={q.indice} className={cx('border-b border-border last:border-0', q.actual && 'bg-surface-2')}>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-ink">{rangoFechas(q.inicio, q.fin)}</td>
                    {q.plazas.map((p) => {
                      const mia = p.vivienda !== null && p.vivienda === user.vivienda
                      return (
                        <td key={p.numero}
                          className={cx('whitespace-nowrap px-3 py-2.5 text-center', mia ? 'bg-primary-soft font-bold text-primary-700' : p.vivienda ? 'text-ink' : 'text-faint')}>
                          {p.vivienda ?? '—libre—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Alert tipo="info">Solo turismos. Los cambios de turno, hasta el sábado a las 20:00.</Alert>

        {/* ¿Cedes o necesitas plaza? */}
        <section>
          <h2 className="overline mb-2 flex items-center gap-1.5"><ArrowLeftRight size={14} /> ¿Cedes o necesitas plaza?</h2>
          <Card className="flex flex-col gap-4">
            <SelectField label="¿Qué quieres avisar?" value={tipo} onChange={(e) => setTipo(e.target.value as CesionTipo)}>
              {TIPO_LABEL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              <Field label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Textarea label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Cualquier detalle útil para la gestión…" />
            <Button block disabled={!valido || enviando} onClick={enviar}>
              {enviando ? 'Enviando…' : 'Enviar aviso'}
            </Button>
          </Card>
        </section>

        {/* Panel de demanda */}
        <section>
          <h2 className="overline mb-2">Demanda actual</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center">
              <div className="font-display text-[28px] font-extrabold text-ink">{demanda.data?.necesitan ?? 0}</div>
              <div className="mt-1 text-[13px] text-muted">viviendas necesitan plaza</div>
            </Card>
            <Card className="text-center">
              <div className="font-display text-[28px] font-extrabold text-ink">{demanda.data?.ceden ?? 0}</div>
              <div className="mt-1 text-[13px] text-muted">viviendas ceden</div>
            </Card>
          </div>
        </section>
      </Page>
    </div>
  )
}
