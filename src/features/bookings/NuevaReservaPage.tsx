import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, MapPin, Clock, Users, CalendarDays, ChevronLeft, ArrowRight } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, SelectField, Alert, SkeletonList, cx } from '@/components/ui'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { fechaHora, hora } from '@/lib/format'
import { esTester, puedeReservar, puedeReservarOtras } from '@/lib/roles'
import { listZonas, reservaVigente, ocupacionDia, crearReserva, listViviendas } from '@/lib/api'
import { pad, claveDia, slotISO, evaluarZona, rangoHoras, type DispZona } from './reservaUtils'

// Asistente de nueva reserva PASO A PASO (una pregunta por pantalla): zona → día
// → horario → invitados (si aplica) → resumen. Así el vecino no ve todo de golpe.
type Paso = 'vivienda' | 'zona' | 'dia' | 'hora' | 'invitados' | 'resumen'

export function NuevaReservaPage() {
  const { user, toast } = useApp()
  const nav = useNavigate()

  const reservarOtras = puedeReservarOtras(user.rol)
  const vigente = useAsync(reservaVigente, [])
  const zonas = useAsync(listZonas, [], { key: 'zonas', ttlMs: TTL.zonas })
  const viviendas = useAsync(() => (reservarOtras ? listViviendas() : Promise.resolve([])), [reservarOtras])

  const hoy = useMemo(() => claveDia(new Date()), [])
  const maxDia = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return claveDia(d) }, [])

  const [sel, setSel] = useState<Set<string>>(new Set())
  const [dia, setDia] = useState(hoy)
  const [desde, setDesde] = useState('10:00')
  const [hasta, setHasta] = useState('12:00')
  const [invitados, setInvitados] = useState('')
  const [viviendaObjetivo, setViviendaObjetivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [paso, setPaso] = useState<Paso>(reservarOtras ? 'vivienda' : 'zona')

  const ocupacion = useAsync(() => ocupacionDia(dia), [dia])

  const zonasSel = useMemo(() => (zonas.data ?? []).filter((z) => sel.has(z.id)), [zonas.data, sel])
  const needInv = zonasSel.some((z) => z.requiere_invitados)

  // Horas completas (sin minutos), derivadas de las franjas de las zonas.
  const { lo: horaLo, hi: horaHi } = useMemo(() => rangoHoras(zonas.data ?? []), [zonas.data])
  const horasDesde = useMemo(() => Array.from({ length: horaHi - horaLo }, (_, i) => `${pad(horaLo + i)}:00`), [horaLo, horaHi])
  const horasHasta = useMemo(() => {
    const ini = Math.max(horaLo + 1, Number(desde.slice(0, 2)) + 1)
    return Array.from({ length: Math.max(0, horaHi - ini + 1) }, (_, i) => `${pad(ini + i)}:00`)
  }, [horaLo, horaHi, desde])
  useEffect(() => { if (horasDesde.length && !horasDesde.includes(desde)) setDesde(horasDesde[0]) }, [horasDesde, desde])
  useEffect(() => { if (horasHasta.length && !horasHasta.includes(hasta)) setHasta(horasHasta[0]) }, [horasHasta, hasta])

  const rangoOk = desde < hasta
  const disponibilidad = useMemo<DispZona[]>(
    () => (rangoOk ? zonasSel.map((z) => evaluarZona(z, dia, desde, hasta, ocupacion.data ?? [])) : []),
    [zonasSel, dia, desde, hasta, ocupacion.data, rangoOk],
  )
  const todasOk = disponibilidad.length > 0 && disponibilidad.every((d) => d.ok)
  const invitadosOk = !needInv || (invitados !== '' && Number(invitados) >= 0)

  // Secuencia de pasos (invitados solo si alguna zona lo requiere).
  const pasos = useMemo<Paso[]>(() => {
    const p: Paso[] = []
    if (reservarOtras) p.push('vivienda')
    p.push('zona', 'dia', 'hora')
    if (needInv) p.push('invitados')
    p.push('resumen')
    return p
  }, [reservarOtras, needInv])
  useEffect(() => { if (!pasos.includes(paso)) setPaso(pasos[0]) }, [pasos, paso])

  const idx = Math.max(0, pasos.indexOf(paso))
  const pasoOk =
    paso === 'zona' ? sel.size > 0
      : paso === 'hora' ? (rangoOk && todasOk && ocupacion.state !== 'loading')
      : paso === 'invitados' ? invitadosOk
      : true

  function toggleZona(id: string) {
    setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const atras = () => { if (idx === 0) nav('/reservas'); else setPaso(pasos[idx - 1]) }
  const siguiente = () => { if (pasoOk && idx < pasos.length - 1) setPaso(pasos[idx + 1]) }

  async function reservar() {
    if (saving) return
    setErr(''); setSaving(true)
    try {
      await crearReserva({
        zonaIds: [...sel],
        inicio: slotISO(dia, desde),
        fin: slotISO(dia, hasta),
        numInvitados: needInv ? Number(invitados) : 0,
        viviendaObjetivo: reservarOtras && viviendaObjetivo ? viviendaObjetivo : undefined,
      })
      toast('Reserva confirmada', 'ok')
      nav('/reservas')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la reserva.')
    } finally {
      setSaving(false)
    }
  }

  const cargando = zonas.state === 'loading' || vigente.state === 'loading'
  // Regla: 1 reserva vigente por vivienda (no aplica a quien reserva para otras).
  const bloqueado = !reservarOtras && !!vigente.data

  const fechaLarga = useMemo(() => {
    const d = new Date(`${dia}T00:00:00`)
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  }, [dia])

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <SubHeader titulo="Nueva reserva" />

      <div className="flex-1">
        <Page className="mx-auto max-w-[560px]">
          {cargando && <SkeletonList />}

          {!cargando && esTester(user.rol) && (
            <Alert tipo="info">Cuenta de pruebas (Tester): solo lectura. No puedes realizar reservas.</Alert>
          )}
          {!cargando && !esTester(user.rol) && !puedeReservar(user.rol) && (
            <Alert tipo="warn">Tu rol no tiene permiso para realizar reservas.</Alert>
          )}
          {!cargando && bloqueado && (
            <Alert tipo="warn">Ya tienes una reserva vigente (una por vivienda). Anúlala desde “Reservas” para poder pedir otra.</Alert>
          )}

          {!cargando && !bloqueado && puedeReservar(user.rol) && !esTester(user.rol) && (
            <>
              <p className="mb-3 text-[12.5px] font-semibold text-muted">Paso {idx + 1} de {pasos.length}</p>

              {paso === 'vivienda' && (
                <Card className="flex flex-col gap-2">
                  <h2 className="font-display text-[19px] font-bold text-ink">¿Para qué vivienda?</h2>
                  <p className="text-[13px] text-muted">Puedes reservar a nombre de otra vivienda (p. ej. un vecino que te lo pide en persona).</p>
                  <SelectField label="Vivienda" value={viviendaObjetivo} onChange={(e) => setViviendaObjetivo(e.target.value)}>
                    <option value="">La mía ({user.vivienda || '—'})</option>
                    {(viviendas.data ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
                  </SelectField>
                </Card>
              )}

              {paso === 'zona' && (
                <Card className="flex flex-col gap-3">
                  <h2 className="font-display text-[19px] font-bold text-ink">¿Qué zona quieres?</h2>
                  <p className="text-[13px] text-muted">Puedes elegir una o varias.</p>
                  <div className="flex flex-wrap gap-2">
                    {(zonas.data ?? []).map((z) => {
                      const on = sel.has(z.id)
                      return (
                        <button key={z.id} type="button" onClick={() => toggleZona(z.id)}
                          className={cx('inline-flex items-center gap-1.5 rounded-pill border px-4 py-2.5 text-[14px] font-semibold transition-colors',
                            on ? 'border-primary bg-primary text-white' : 'border-border bg-surface-2 text-muted hover:border-border-strong')}>
                          {on && <Check size={16} />}{z.nombre}
                        </button>
                      )
                    })}
                  </div>
                </Card>
              )}

              {paso === 'dia' && (
                <Card className="flex flex-col gap-2">
                  <h2 className="font-display text-[19px] font-bold text-ink">¿Qué día?</h2>
                  <Field type="date" min={hoy} max={maxDia} value={dia} onChange={(e) => setDia(e.target.value || hoy)} />
                  <p className="text-[12px] text-faint">Puedes reservar hasta 6 meses vista.</p>
                </Card>
              )}

              {paso === 'hora' && (
                <Card className="flex flex-col gap-3">
                  <h2 className="font-display text-[19px] font-bold text-ink">¿En qué horario?</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)}>
                      {horasDesde.map((h) => <option key={h} value={h}>{h}</option>)}
                    </SelectField>
                    <SelectField label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)}>
                      {horasHasta.map((h) => <option key={h} value={h}>{h}</option>)}
                    </SelectField>
                  </div>
                  <p className="text-[12px] text-faint">Las reservas son por horas completas.</p>
                  {!rangoOk && <p className="text-[13px] text-danger">La hora de fin debe ser posterior a la de inicio.</p>}
                  {rangoOk && (
                    <div className="flex flex-col gap-2">
                      {disponibilidad.map((d) => (
                        <div key={d.zona.id}
                          className={cx('flex items-center justify-between gap-2 rounded-[14px] border px-3 py-2.5 text-[14px]',
                            d.ok ? 'border-success/40 bg-success-soft text-success-ink' : 'border-danger/40 bg-danger-soft text-danger-ink')}>
                          <span className="flex items-center gap-1.5 font-semibold"><MapPin size={15} /> {d.zona.nombre}</span>
                          <span className="text-[12px] font-bold">{d.ok ? 'Libre' : d.motivo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {paso === 'invitados' && (
                <Card className="flex flex-col gap-2">
                  <h2 className="font-display text-[19px] font-bold text-ink">¿Cuántos sois?</h2>
                  <p className="text-[13px] text-muted">Número aproximado de personas/invitados.</p>
                  <Field label="Nº de invitados" type="number" inputMode="numeric" min={0}
                    value={invitados} onChange={(e) => setInvitados(e.target.value)} placeholder="0" />
                </Card>
              )}

              {paso === 'resumen' && (
                <Card className="flex flex-col gap-3">
                  <h2 className="font-display text-[19px] font-bold text-ink">Revisa y confirma</h2>
                  <div className="flex flex-col gap-2 text-[14px] text-ink">
                    <div className="flex items-center gap-2"><MapPin size={16} className="text-muted" /> {zonasSel.map((z) => z.nombre).join(' + ') || '—'}</div>
                    <div className="flex items-center gap-2"><CalendarDays size={16} className="text-muted" /> {fechaLarga}</div>
                    <div className="flex items-center gap-2"><Clock size={16} className="text-muted" /> {desde}–{hasta}</div>
                    {needInv && <div className="flex items-center gap-2"><Users size={16} className="text-muted" /> {invitados || 0} invitados</div>}
                    {reservarOtras && <div className="text-[13px] text-muted">Vivienda: {viviendaObjetivo || `la mía (${user.vivienda || '—'})`}</div>}
                  </div>
                  <Alert tipo="info">La reserva queda confirmada al momento.</Alert>
                  {err && <Alert tipo="danger">{err}</Alert>}
                </Card>
              )}
            </>
          )}
        </Page>
      </div>

      {/* Barra Atrás / Siguiente (o Reservar): sticky, justo encima del TabBar. */}
      {!cargando && !bloqueado && puedeReservar(user.rol) && !esTester(user.rol) && (
        <div className="sticky bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-[560px] gap-2">
            <Button variant="secondary" onClick={atras}><ChevronLeft size={18} /> Atrás</Button>
            {paso === 'resumen' ? (
              <Button block size="lg" disabled={saving} onClick={reservar}>
                <CalendarDays size={18} /> {saving ? 'Reservando…' : 'Reservar'}
              </Button>
            ) : (
              <Button block size="lg" disabled={!pasoOk} onClick={siguiente}>
                Siguiente <ArrowRight size={18} />
              </Button>
            )}
          </div>
        </div>
      )}

      {!cargando && (bloqueado || !puedeReservar(user.rol) || esTester(user.rol)) && (
        <div className="sticky bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-[560px]">
            <Button block variant="secondary" onClick={() => nav('/reservas')}>Volver a reservas</Button>
          </div>
        </div>
      )}
    </div>
  )
}
