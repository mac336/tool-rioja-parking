import { Clock, Users } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { fechaHora, hora } from '@/lib/format'
import { misReservas, cancelarReserva } from '@/lib/api'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import type { ReservaGrupo, ReservaEstado } from '@/types'

const TZ = 'Europe/Madrid'

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
  const { toast } = useApp()
  const { data, state, refetch } = useAsync(misReservas, [])

  async function anular(grupoId: string) {
    await cancelarReserva(grupoId)
    refetch()
    toast('Reserva anulada')
  }

  const reservas = (data ?? []).slice().sort((a, b) => b.inicio.localeCompare(a.inicio))
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
              const anulable = futura && (r.estado === 'pendiente' || r.estado === 'aprobada')
              return (
                <Card key={r.grupo_id}>
                  <div className="flex items-start gap-3">
                    <CuadroFecha iso={r.inicio} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-display text-[16px] font-bold text-ink">{r.zonas.map((z) => z.nombre).join(' + ')}</h3>
                        <EstadoPill estado={r.estado} />
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
                </Card>
              )
            })}
          </div>
        )}
      </Page>
    </div>
  )
}
