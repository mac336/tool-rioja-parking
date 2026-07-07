import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Check, Clock, Users, X } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { fechaHora, hora, rangoFechas } from '@/lib/format'
import { puedeAprobarReservas } from '@/lib/roles'
import {
  listZonas, reservaVigente, ocupacionZonaDia, crearReserva,
  cancelarReserva, reservasPendientesGestion, resolverReserva,
} from '@/lib/api'
import { Button, Card, Field, Alert, ErrorState, SkeletonList, cx } from '@/components/ui'
import type { Reserva, ReservaEstado, ZonaComun } from '@/types'

// ---- Utilidades de franjas horarias -----------------------------------------

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

/** Genera bloques consecutivos de hasta 3h dentro de franja_min..franja_max. */
function generarFranjas(zona: ZonaComun): { desde: string; hasta: string }[] {
  const min = zona.franja_min ?? '09:00'
  const max = zona.franja_max ?? '22:00'
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0) }
  const toHHMM = (t: number) => `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
  const fin = toMin(max)
  const out: { desde: string; hasta: string }[] = []
  let cur = toMin(min)
  while (cur + 60 <= fin) {
    const next = Math.min(cur + 180, fin)
    out.push({ desde: toHHMM(cur), hasta: toHHMM(next) })
    cur = next
  }
  return out
}

type EstadoFranja = 'libre' | 'pendiente' | 'ocupada'
/** Cruza una franja con la ocupación del día para etiquetarla. */
function estadoDeFranja(
  iniISO: string, finISO: string,
  ocup: { inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[],
): EstadoFranja {
  const ini = new Date(iniISO).getTime()
  const fin = new Date(finISO).getTime()
  let estado: EstadoFranja = 'libre'
  for (const o of ocup) {
    const oi = new Date(o.inicio).getTime()
    const of = new Date(o.fin).getTime()
    const solapa = oi < fin && of > ini
    if (!solapa) continue
    if (o.estado === 'aprobada') return 'ocupada'
    estado = 'pendiente'
  }
  return estado
}

// ---- Pill de estado de reserva -----------------------------------------------

const PILL: Record<ReservaEstado, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente de aprobar', cls: 'bg-warn-soft text-[#8a5a0f]' },
  aprobada: { label: 'Aprobada', cls: 'bg-success-soft text-[#0f6b3f]' },
  rechazada: { label: 'Rechazada', cls: 'bg-danger-soft text-[#a3341f]' },
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

  const [zonaId, setZonaId] = useState<string | null>(null)
  const [dia, setDia] = useState<string>(claveDia(new Date()))
  const [franja, setFranja] = useState<{ desde: string; hasta: string } | null>(null)
  const [invitados, setInvitados] = useState('')
  const [saving, setSaving] = useState(false)

  // Selecciona la primera zona cuando cargan.
  useEffect(() => {
    if (zonaId === null && zonas.data && zonas.data.length > 0) setZonaId(zonas.data[0].id)
  }, [zonaId, zonas.data])

  const ocupacion = useAsync(
    () => (zonaId ? ocupacionZonaDia(zonaId, dia) : Promise.resolve([])),
    [zonaId, dia],
  )

  const zona = useMemo(() => zonas.data?.find((z) => z.id === zonaId) ?? null, [zonas.data, zonaId])
  const franjas = useMemo(() => (zona ? generarFranjas(zona) : []), [zona])

  const dias = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d
  }), [])

  async function anular(id: string) {
    await cancelarReserva(id)
    setFranja(null); setInvitados('')
    vigente.refetch()
    toast('Reserva anulada')
  }

  async function solicitar() {
    if (!zona || !franja) return
    const needInv = zona.requiere_invitados
    const num = Number(invitados)
    if (needInv && (!invitados || Number.isNaN(num) || num < 0)) return
    setSaving(true)
    try {
      await crearReserva({
        zonaId: zona.id,
        inicio: slotISO(dia, franja.desde),
        fin: slotISO(dia, franja.hasta),
        numInvitados: needInv ? num : 0,
      })
      toast('Reserva solicitada, pendiente de aprobación', 'info')
      nav('/reservas/mias')
    } finally {
      setSaving(false)
    }
  }

  async function resolver(id: string, aprobar: boolean) {
    await resolverReserva(id, aprobar)
    gestion.refetch()
    toast(aprobar ? 'Reserva aprobada' : 'Reserva rechazada')
  }

  const cargando = vigente.state === 'loading' || zonas.state === 'loading'
  const invitadosOk = !zona?.requiere_invitados || (invitados !== '' && Number(invitados) >= 0)
  const puedeSolicitar = !!franja && invitadosOk && !saving

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur safe-top">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Reservas</h1>
        <Link to="/reservas/mias" className="text-[14px] font-bold text-primary hover:underline">Mis reservas</Link>
      </header>

      <div className="px-4 py-4">
        {cargando && <SkeletonList />}
        {!cargando && (vigente.state === 'error' || zonas.state === 'error') && <ErrorState onRetry={() => { vigente.refetch(); zonas.refetch() }} />}

        {/* Caso 1: la vivienda ya tiene una reserva vigente */}
        {!cargando && vigente.data && (
          <Card className="border-2 border-primary">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="overline text-primary">Ya tienes una reserva vigente</div>
                <h2 className="mt-1 font-display text-[19px] font-bold text-ink">{vigente.data.zona_nombre}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-[14px] text-muted">
                  <Clock size={15} /> {fechaHora(vigente.data.inicio)}–{hora(vigente.data.fin)}
                </p>
              </div>
              <EstadoPill estado={vigente.data.estado} />
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Solo se permite una reserva por vivienda a la vez. Anula esta para poder solicitar otra.
            </p>
            <div className="mt-3">
              <Button variant="danger-outline" block onClick={() => anular(vigente.data!.id)}>Anular reserva</Button>
            </div>
          </Card>
        )}

        {/* Caso 2: sin reserva vigente → flujo de nueva reserva */}
        {!cargando && !vigente.data && zonas.state !== 'error' && (
          <div className="flex flex-col gap-5 pb-4">
            <section>
              <h2 className="overline mb-2">Elige una zona</h2>
              <div className="flex flex-wrap gap-2">
                {(zonas.data ?? []).map((z) => (
                  <button key={z.id} type="button"
                    onClick={() => { setZonaId(z.id); setFranja(null) }}
                    className={cx('rounded-pill border px-3.5 py-2 text-[13px] font-semibold transition-colors',
                      z.id === zonaId ? 'border-primary bg-primary text-white' : 'border-border bg-surface-2 text-muted hover:border-border-strong')}>
                    {z.nombre}
                  </button>
                ))}
              </div>
              {zona?.descripcion && <p className="mt-2 text-[13px] text-muted">{zona.descripcion}</p>}
            </section>

            <section>
              <h2 className="overline mb-2">Elige un día</h2>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {dias.map((d) => {
                  const clave = claveDia(d)
                  const sel = clave === dia
                  const dow = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(d).replace('.', '')
                  const dm = new Intl.DateTimeFormat('es-ES', { day: 'numeric' }).format(d)
                  return (
                    <button key={clave} type="button"
                      onClick={() => { setDia(clave); setFranja(null) }}
                      className={cx('flex min-w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[14px] border px-2 py-2 transition-colors',
                        sel ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-ink hover:bg-surface-2')}>
                      <span className={cx('text-[11px] font-semibold uppercase', sel ? 'text-white/80' : 'text-faint')}>{dow}</span>
                      <span className="text-[18px] font-bold leading-none">{dm}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="overline mb-2">Elige una franja</h2>
              {ocupacion.state === 'loading' && <SkeletonList n={2} />}
              {ocupacion.state !== 'loading' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {franjas.map((f) => {
                    const iniISO = slotISO(dia, f.desde)
                    const finISO = slotISO(dia, f.hasta)
                    const est = estadoDeFranja(iniISO, finISO, ocupacion.data ?? [])
                    const sel = franja?.desde === f.desde && franja?.hasta === f.hasta
                    const libre = est === 'libre'
                    return (
                      <button key={f.desde} type="button" disabled={!libre}
                        onClick={() => setFranja({ desde: f.desde, hasta: f.hasta })}
                        className={cx('flex flex-col items-start gap-0.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors',
                          !libre && 'cursor-not-allowed',
                          est === 'ocupada' && 'border-border bg-surface-2 text-faint',
                          est === 'pendiente' && 'border-warn/40 bg-warn-soft text-[#8a5a0f]',
                          libre && sel && 'border-primary bg-primary text-white',
                          libre && !sel && 'border-border-strong bg-surface text-ink hover:border-primary')}>
                        <span className="text-[15px] font-bold">{f.desde}–{f.hasta}</span>
                        <span className="text-[12px] font-semibold">
                          {est === 'libre' ? 'Libre' : est === 'pendiente' ? 'Pendiente de aprobar' : 'Ocupada'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {zona?.requiere_invitados && (
              <Field label="Nº de invitados" type="number" inputMode="numeric" min={0}
                value={invitados} onChange={(e) => setInvitados(e.target.value)}
                placeholder="0" />
            )}

            <Alert tipo="info">Tu reserva quedará pendiente de que el presidente la apruebe.</Alert>
          </div>
        )}

        {/* Cola de aprobación (presidente / app_admin) */}
        {puedeAprobarReservas(user.rol) && (
          <section className="mt-6">
            <h2 className="overline mb-2">Cola de aprobación</h2>
            {gestion.state === 'loading' && <SkeletonList n={2} />}
            {gestion.state === 'error' && <ErrorState onRetry={gestion.refetch} />}
            {gestion.state === 'empty' && <p className="text-[14px] text-muted">No hay reservas pendientes de aprobar.</p>}
            {gestion.state === 'ready' && (
              <div className="flex flex-col gap-3">
                {(gestion.data ?? []).map((r: Reserva) => (
                  <Card key={r.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-[16px] font-bold text-ink">{r.zona_nombre}</div>
                      <EstadoPill estado={r.estado} />
                    </div>
                    <p className="mt-1 text-[13px] text-muted">Vivienda {r.vivienda}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={14} /> {fechaHora(r.inicio)}–{hora(r.fin)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Users size={14} /> {r.num_invitados} invitados</p>
                    <div className="mt-3 flex gap-2">
                      <Button block onClick={() => resolver(r.id, true)}><Check size={17} /> Aprobar</Button>
                      <Button variant="danger-outline" block onClick={() => resolver(r.id, false)}><X size={17} /> Rechazar</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Barra inferior de acción (solo en el flujo de nueva reserva) */}
      {!cargando && !vigente.data && franja && (
        <>
          <div className="h-[84px]" aria-hidden />
          <div className="fixed inset-x-0 bottom-[78px] z-20 md:bottom-0">
            <div className="mx-auto max-w-[720px] border-t border-border bg-surface/95 p-3 backdrop-blur safe-bottom">
              <Button block size="lg" disabled={!puedeSolicitar} onClick={solicitar}>
                <CalendarDays size={18} /> {saving ? 'Solicitando…' : 'Solicitar reserva'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
