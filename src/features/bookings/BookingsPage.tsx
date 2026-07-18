import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { reservaVigente } from '@/lib/api'
import { esTester, puedeReservar, puedeReservarOtras, puedeVerAgendaReservas } from '@/lib/roles'
import { Button, Alert } from '@/components/ui'
import { MisReservasLista } from './MisReservasLista'

// Pantalla principal de Reservas: muestra directamente MIS RESERVAS y, arriba, un
// botón "Nueva reserva" que abre el asistente paso a paso (NuevaReservaPage).
export function BookingsPage() {
  const { user } = useApp()
  const vigente = useAsync(reservaVigente, [])
  const reservarOtras = puedeReservarOtras(user.rol)
  const tester = esTester(user.rol)
  // Regla: una reserva vigente por vivienda (no aplica a quien reserva para otras).
  const bloqueado = !reservarOtras && !!vigente.data
  const puedeNueva = puedeReservar(user.rol) && !tester

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur safe-top">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Reservas</h1>
        {puedeVerAgendaReservas(user.rol) && (
          <Link to="/reservas/agenda" className="text-[14px] font-bold text-primary hover:underline">Agenda</Link>
        )}
      </header>

      <div className="px-4 py-4 pb-8">
        {/* Botón de nueva reserva (o aviso si ya hay una vigente) */}
        {puedeNueva && !bloqueado && (
          <Link to="/reservas/nueva" className="mb-4 block">
            <Button block size="lg"><Plus size={18} /> Nueva reserva</Button>
          </Link>
        )}
        {puedeNueva && bloqueado && (
          <Alert tipo="info">Ya tienes una reserva vigente (una por vivienda). Anúlala abajo para poder pedir otra.</Alert>
        )}
        {tester && (
          <Alert tipo="info">Cuenta de pruebas (Tester): solo lectura. Puedes mirarlo todo, pero no reservar.</Alert>
        )}
        {!puedeReservar(user.rol) && !tester && (
          <Alert tipo="warn">Tu rol no tiene permiso para realizar reservas.</Alert>
        )}

        <div className="mt-4">
          <MisReservasLista />
        </div>
      </div>
    </div>
  )
}
