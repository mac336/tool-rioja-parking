import { Clock, Users } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { fechaHora, hora } from '@/lib/format'
import { puedeReservarOtras } from '@/lib/roles'
import { misReservas, cancelarReserva } from '@/lib/api'
import { puedeAnularReserva, reservaCelebrada, HORAS_MIN_ANULACION } from '@/lib/reglas'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import type { ReservaGrupo, ReservaEstado } from '@/types'

const TZ = 'Europe/Madrid'

const PILL: Record<ReservaEstado | 'celebrada', { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente de aprobar', cls: 'bg-warn-soft text-warn-ink' },
  aprobada: { label: 'Aprobada', cls: 'bg-success-soft text-success-ink' },
  rechazada: { label: 'Rechazada', cls: 'bg-danger-soft text-danger-ink' },
  cancelada: { label: 'Cancelada', cls: 'bg-surface-2 text-muted' },
  celebrada: { label: 'Celebrada', cls: 'bg-info-soft text-info-ink' }, // archivada
}
function EstadoPill({ estado }: { estado: ReservaEstado | 'celebrada' }) {
  const p = PILL[estado]
  return <span className={cx('inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-bold', p.cls)}>{p.label}</span>
}

function CuadroFecha({ iso }: { iso: string }) {
  const d = new Date(iso)
  const mes = new Intl.DateTimeFormat('es-ES', { timeZone: TZ, month: 'short' }).format(d).replace('.', '')
  const dia = new Intl.DateTimeFormat('es-ES', { timeZone: TZ, day: 'numeric' }).format(d)
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] bg-primary-soft text-primary-700">
      <span className="text-[11px] font-bold uppercase leading-none">{mes}</span>
      <span className="text-[20px] font-extrabold leading-tight">{dia}</span>
    </div>
  )
}

export function MyBookingsPage() {
  const { user, toast } = useApp()
  const { data, state, refetch } = useAsync(misReservas, [])
  // Quien reserva para OTRAS viviendas (p. ej. el conserje) acumularía muchas
  // canceladas/rechazadas aquí (son de otros vecinos): se le ocultan.
  const ocultarNoVigentes = puedeReservarOtras(user.rol)

  async function anular(grupoId: string) {
    try {
      await cancelarReserva(grupoId)
      refetch()
      toast('Reserva anulada')
    } catch {
      toast(`No se pudo anular (solo hasta ${HORAS_MIN_ANULACION} h antes)`, 'error')
    }
  }

  const reservas = (data ?? [])
    .filter((r) => !ocultarNoVigentes || (r.estado !== 'cancelada' && r.estado !== 'rechazada'))
    .slice()
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
  const ahora = Date.now()

  return (
    <div>
      <SubHeader titulo="Mis reservas" />
      <Page>
        {state === 'loading' && <SkeletonList />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'empty' && (
          <EmptyState titulo="Sin reservas" texto="Aún no has solicitado ninguna reserva de zonas comunes." />
        )}

        {state === 'ready' && (
          <div className="flex flex-col gap-3">
            {reservas.map((r: ReservaGrupo) => {
              const futura = new Date(r.fin).getTime() > ahora
              const vigente = futura && (r.estado === 'pendiente' || r.estado === 'aprobada')
              // Solo se puede anular hasta 24 h antes del inicio (regla en BD, mig. 0020).
              const anulable = vigente && puedeAnularReserva(r.inicio)
              const celebrada = reservaCelebrada(r.estado, r.fin)
              return (
                <Card key={r.grupo_id}>
                  <div className="flex items-start gap-3">
                    <CuadroFecha iso={r.inicio} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-display text-[16px] font-bold text-ink">{r.zonas.map((z) => z.nombre).join(' + ')}</h3>
                        <EstadoPill estado={celebrada ? 'celebrada' : r.estado} />
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={14} /> {fechaHora(r.inicio)}–{hora(r.fin)}</p>
                      {r.num_invitados > 0 && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Users size={14} /> {r.num_invitados} invitados</p>
                      )}
                      {r.estado === 'rechazada' && r.motivo_rechazo && (
                        <p className="mt-1 text-[13px] text-danger">Motivo: {r.motivo_rechazo}</p>
                      )}
                    </div>
                  </div>
                  {anulable && (
                    <div className="mt-3">
                      <Button variant="danger-outline" block onClick={() => anular(r.grupo_id)}>Anular</Button>
                    </div>
                  )}
                  {vigente && !anulable && (
                    <p className="mt-3 rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
                      Ya no se puede anular: quedan menos de {HORAS_MIN_ANULACION} h para el inicio.
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </Page>
    </div>
  )
}
