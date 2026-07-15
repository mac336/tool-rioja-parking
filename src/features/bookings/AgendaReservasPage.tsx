import { SubHeader, Page } from '@/components/layout/AppShell'
import { AgendaMensual } from './AgendaMensual'

// Agenda de reservas accesible DESDE el servicio de Reservas (no hace falta
// entrar al panel de gestión). Protegida por el permiso `ver_agenda_reservas`
// (RequireVerAgendaReservas en el router). Pensada para roles como el conserje,
// que pueden así ayudar a un vecino a encontrar un hueco libre.
export function AgendaReservasPage() {
  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Agenda de reservas" />
      <Page>
        <p className="mb-3 text-[14px] text-muted">
          Reservas de todas las viviendas y zonas comunes. Cada color de punto es una zona distinta.
        </p>
        <AgendaMensual />
      </Page>
    </div>
  )
}
