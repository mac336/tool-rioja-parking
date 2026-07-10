import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Check, Clock, MapPin, Users, X } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { fechaHora, hora } from '@/lib/format'
import { puedeAprobarReservas } from '@/lib/roles'
import { puedeAnularReserva, HORAS_MIN_ANULACION } from '@/lib/reglas'
import {
  listZonas, reservaVigente, ocupacionDia, crearReserva,
  cancelarReserva, reservasPendientesGestion, resolverReserva,
} from '@/lib/api'
import { Button, Card, Field, Alert, ErrorState, SkeletonList, cx } from '@/components/ui'
import type { ReservaGrupo, ReservaEstado, ZonaComun } from '@/types'

// ---- Utilidades de fecha/hora ------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')
/** Clave de día local "YYYY-MM-DD" (sin desfase UTC de toISOString). */
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** ISO de una hora "HH:MM" en el día indicado (hora local del dispositivo). */
function slotISO(dia: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${dia}T00:00:00`)
  d.setHours(h, m ?? 0, 0, 0)
  return d.toISOString()
}
const aMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0) }
const solapa = (aIni: string, aFin: string, bIni: string, bFin: string) =>
  new Date(aIni).getTime() < new Date(bFin).getTime() && new Date(bIni).getTime() < new Date(aFin).getTime()

type Ocup = { zona_id: string; inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }
type DispZona = { zona: ZonaComun; ok: boolean; motivo?: string }

/** Evalúa si una zona está disponible en la ventana elegida. */
function evaluarZona(zona: ZonaComun, dia: string, desde: string, hasta: string, ocup: Ocup[]): DispZona {
  const min = zona.franja_min ?? '00:00'
  const max = zona.franja_max ?? '23:59'
  if (desde < min || hasta > max) return { zona, ok: false, motivo: `Horario permitido ${min}–${max}` }
  if (zona.duracion_max_min && aMin(hasta) - aMin(desde) > zona.duracion_max_min) {
    return { zona, ok: false, motivo: `Máx. ${Math.floor(zona.duracion_max_min / 60)}h por reserva` }
  }
  const ini = slotISO(dia, desde), fin = slotISO(dia, hasta)
  const choca = ocup.some((o) => o.zona_id === zona.id && solapa(ini, fin, o.inicio, o.fin))
  if (choca) return { zona, ok: false, motivo: 'Ocupada en ese horario' }
  return { zona, ok: true }
}

// ---- Pill de estado de reserva -----------------------------------------------

const PILL: Record<ReservaEstado, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente de aprobar', cls: 'bg-warn-soft text-warn-ink' },
  aprobada: { label: 'Aprobada', cls: 'bg-success-soft text-success-ink' },
  rechazada: { label: 'Rechazada', cls: 'bg-danger-soft text-danger-ink' },
  cancelada: { label: 'Cancelada', cls: 'bg-surface-2 text-muted' },
}
function EstadoPill({ estado }: { estado: ReservaEstado }) {
  const p = PILL[estado]
  return <span className={cx('inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-bold', p.cls)}>{p.label}</span>
}

// ---- Página ------------------------------------------------------------------

export function BookingsPage() {
  const { user, toast } = useApp()
  const nav = useNavigate()

  const vigente = useAsync(reservaVigente, [])
  const zonas = useAsync(listZonas, [])
  const gestion = useAsync(reservasPendientesGestion, [])

  const hoy = useMemo(() => claveDia(new Date()), [])
  const maxDia = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return claveDia(d) }, [])

  const [sel, setSel] = useState<Set<string>>(new Set())
  const [dia, setDia] = useState<string>(hoy)
  const [desde, setDesde] = useState('10:00')
  const [hasta, setHasta] = useState('12:00')
  const [invitados, setInvitados] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const ocupacion = useAsync(() => ocupacionDia(dia), [dia])

  const zonasSel = useMemo(
    () => (zonas.data ?? []).filter((z) => sel.has(z.id)),
    [zonas.data, sel],
  )
  const rangoOk = desde < hasta
  const disponibilidad = useMemo<DispZona[]>(
    () => (rangoOk ? zonasSel.map((z) => evaluarZona(z, dia, desde, hasta, ocupacion.data ?? [])) : []),
    [zonasSel, dia, desde, hasta, ocupacion.data, rangoOk],
  )
  const todasOk = disponibilidad.length > 0 && disponibilidad.every((d) => d.ok)
  const needInv = zonasSel.some((z) => z.requiere_invitados)
  const invitadosOk = !needInv || (invitados !== '' && Number(invitados) >= 0)
  const puedeSolicitar = sel.size > 0 && rangoOk && todasOk && invitadosOk && !saving

  function toggleZona(id: string) {
    setSel((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function anular(grupoId: string) {
    try {
      await cancelarReserva(grupoId)
      vigente.refetch()
      toast('Reserva anulada')
    } catch {
      toast(`No se pudo anular (solo hasta ${HORAS_MIN_ANULACION} h antes)`, 'error')
    }
  }

  async function solicitar() {
    if (!puedeSolicitar) return
    setErr(''); setSaving(true)
    try {
      await crearReserva({
        zonaIds: [...sel],
        inicio: slotISO(dia, desde),
        fin: slotISO(dia, hasta),
        numInvitados: needInv ? Number(invitados) : 0,
      })
      toast('Reserva solicitada, pendiente de aprobación', 'info')
      nav('/reservas/mias')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear la reserva.')
    } finally {
      setSaving(false)
    }
  }

  async function resolver(grupoId: string, aprobar: boolean) {
    await resolverReserva(grupoId, aprobar)
    gestion.refetch()
    toast(aprobar ? 'Reserva aprobada' : 'Reserva rechazada')
  }

  const cargando = vigente.state === 'loading' || zonas.state === 'loading'

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur safe-top">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Reservas</h1>
        <Link to="/reservas/mias" className="text-[14px] font-bold text-primary hover:underline">Mis reservas</Link>
      </header>

      <div className="px-4 py-4 pb-8">
        {cargando && <SkeletonList />}
        {!cargando && (vigente.state === 'error' || zonas.state === 'error') && <ErrorState onRetry={() => { vigente.refetch(); zonas.refetch() }} />}

        {/* Caso 1: la vivienda ya tiene una reserva vigente */}
        {!cargando && vigente.data && (
          <Card className="border-2 border-primary">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="overline text-primary">Ya tienes una reserva vigente</div>
                <h2 className="mt-1 font-display text-[19px] font-bold text-ink">
                  {vigente.data.zonas.map((z) => z.nombre).join(' + ')}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-[14px] text-muted">
                  <Clock size={15} /> {fechaHora(vigente.data.inicio)}–{hora(vigente.data.fin)}
                </p>
              </div>
              <EstadoPill estado={vigente.data.estado} />
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Solo se permite una reserva por vivienda a la vez (puede incluir varias zonas). Anúlala para poder solicitar otra.
            </p>
            {puedeAnularReserva(vigente.data.inicio) ? (
              <div className="mt-3">
                <Button variant="danger-outline" block onClick={() => anular(vigente.data!.grupo_id)}>Anular reserva</Button>
              </div>
            ) : (
              <p className="mt-3 rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
                Ya no se puede anular: quedan menos de {HORAS_MIN_ANULACION} h para el inicio.
              </p>
            )}
          </Card>
        )}

        {/* Caso 2: sin reserva vigente → flujo de nueva reserva */}
        {!cargando && !vigente.data && zonas.state !== 'error' && (
          <div className="flex flex-col gap-5">
            <section>
              <h2 className="section-title mb-2">Elige una o varias zonas</h2>
              <div className="flex flex-wrap gap-2">
                {(zonas.data ?? []).map((z) => {
                  const on = sel.has(z.id)
                  return (
                    <button key={z.id} type="button" onClick={() => toggleZona(z.id)}
                      className={cx('inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-[13px] font-semibold transition-colors',
                        on ? 'border-primary bg-primary text-white' : 'border-border bg-surface-2 text-muted hover:border-border-strong')}>
                      {on && <Check size={15} />}{z.nombre}
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="section-title mb-2">Elige el día</h2>
              <Field type="date" min={hoy} max={maxDia} value={dia}
                onChange={(e) => setDia(e.target.value || hoy)} />
              <p className="mt-1 text-[12px] text-faint">Puedes reservar hasta 6 meses vista.</p>
            </section>

            <section>
              <h2 className="section-title mb-2">Elige la hora</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Desde" type="time" value={desde} onChange={(e) => setDesde(e.target.value)} />
                <Field label="Hasta" type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
              {!rangoOk && <p className="mt-1 text-[13px] text-danger">La hora de fin debe ser posterior a la de inicio.</p>}
            </section>

            {/* Disponibilidad por zona seleccionada */}
            {sel.size > 0 && rangoOk && (
              <section>
                <h2 className="section-title mb-2">Disponibilidad</h2>
                {ocupacion.state === 'loading' && <SkeletonList n={1} />}
                {ocupacion.state !== 'loading' && (
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
              </section>
            )}

            {needInv && (
              <Field label="Nº de invitados" type="number" inputMode="numeric" min={0}
                value={invitados} onChange={(e) => setInvitados(e.target.value)} placeholder="0" />
            )}

            {err && <Alert tipo="danger">{err}</Alert>}
            <Alert tipo="info">Tu reserva quedará pendiente de que el presidente la apruebe.</Alert>

            <Button block size="lg" disabled={!puedeSolicitar} onClick={solicitar}>
              <CalendarDays size={18} /> {saving ? 'Solicitando…' : 'Solicitar reserva'}
            </Button>
          </div>
        )}

        {/* Cola de aprobación (presidente / app_admin) */}
        {puedeAprobarReservas(user.rol) && (
          <section className="mt-6">
            <h2 className="section-title mb-2">Cola de aprobación</h2>
            {gestion.state === 'loading' && <SkeletonList n={2} />}
            {gestion.state === 'error' && <ErrorState onRetry={gestion.refetch} />}
            {gestion.state === 'empty' && <p className="text-[14px] text-muted">No hay reservas pendientes de aprobar.</p>}
            {gestion.state === 'ready' && (
              <div className="flex flex-col gap-3">
                {(gestion.data ?? []).map((g: ReservaGrupo) => (
                  <Card key={g.grupo_id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-[16px] font-bold text-ink">{g.zonas.map((z) => z.nombre).join(' + ')}</div>
                      <EstadoPill estado={g.estado} />
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{g.nombre ? `${g.nombre} · ` : ''}Vivienda {g.vivienda}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={14} /> {fechaHora(g.inicio)}–{hora(g.fin)}</p>
                    {g.num_invitados > 0 && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Users size={14} /> {g.num_invitados} invitados</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button block onClick={() => resolver(g.grupo_id, true)}><Check size={17} /> Aprobar</Button>
                      <Button variant="danger-outline" block onClick={() => resolver(g.grupo_id, false)}><X size={17} /> Rechazar</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
