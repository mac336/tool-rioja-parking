import { Link } from 'react-router-dom'
import { Bell, Car, SquareCheckBig, CalendarDays, SquareParking, Phone, Leaf, Megaphone, MessageSquare, Lightbulb } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { saludo, diasRestantes } from '@/lib/format'
import { parkingMisTurnos, listEncuestas, listMensajes } from '@/lib/api'
import { Logo } from '@/components/Logo'
import { TablonBoard } from '@/features/mensajes/TablonBoard'

// Servicios (accesos a módulos) en círculo — colores fijos de cada módulo.
const servicios = [
  { to: '/mensajes', short: 'Mensajes', Icon: Megaphone, color: '#E0A22E' },
  { to: '/buzon', short: 'Buzón', Icon: MessageSquare, color: '#3E7CB1' },
  { to: '/votaciones', short: 'Votaciones', Icon: SquareCheckBig, color: '#5B7FD4' },
  { to: '/reservas', short: 'Reservas', Icon: CalendarDays, color: '#2E8E79' },
  { to: '/parking', short: 'Parking', Icon: SquareParking, color: '#8A6FD1' },
  { to: '/contactos', short: 'Contactos', Icon: Phone, color: '#D98A3D' },
  { to: '/reciclaje', short: 'Reciclaje', Icon: Leaf, color: '#6BAA4E' },
  { to: '/sugerencias', short: 'Sugerencias', Icon: Lightbulb, color: '#C879A9' },
]

const fechaLarga = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

export function HomePage() {
  const { user } = useApp()
  const turnos = useAsync(parkingMisTurnos, [user.vivienda])
  const encuestas = useAsync(listEncuestas, [])
  const mensajes = useAsync(listMensajes, [])

  const abierta = encuestas.data?.find((e) => e.estado === 'abierta')
  const ahora = Date.now()
  const DIA = 864e5

  // Parking en Home: solo se muestra si estás DENTRO de tu turno o a ≤7 días de
  // que empiece. Cuenta atrás cuando quedan ≤3 días. Fuera de eso, no se muestra.
  const misTurnos = turnos.data ?? []
  const turnoActual = misTurnos.find((t) => t.actual)
  const turnoProx = misTurnos.find((t) => !t.actual)
  let parking: { texto: React.ReactNode; urgente: boolean } | null = null
  if (turnoActual) {
    const diasFin = Math.ceil((new Date(turnoActual.fin).getTime() - ahora) / DIA)
    if (diasFin <= 0) parking = { urgente: true, texto: <>Hoy es tu último día en la <b>Plaza {turnoActual.plaza}</b></> }
    else if (diasFin <= 3) parking = { urgente: true, texto: <>Te quedan <b>{diasFin} {diasFin === 1 ? 'día' : 'días'}</b> en la Plaza {turnoActual.plaza}</> }
    else parking = { urgente: false, texto: <>Esta quincena aparcas en la <b>Plaza {turnoActual.plaza}</b></> }
  } else if (turnoProx) {
    const diasIni = Math.ceil((new Date(turnoProx.inicio).getTime() - ahora) / DIA)
    if (diasIni <= 0) parking = { urgente: true, texto: <>Hoy te toca la <b>Plaza {turnoProx.plaza}</b></> }
    else if (diasIni <= 7) parking = { urgente: false, texto: <>En <b>{diasIni} {diasIni === 1 ? 'día' : 'días'}</b> te toca la Plaza {turnoProx.plaza}</> }
  }

  // Actividad reciente para el tablón: incidencias abiertas; avisos vigentes (o
  // sin caducidad, 2 días); anuncios de los últimos 2 días.
  const DOS_DIAS = 2 * 864e5
  const reciente = (m: { created_at: string }) => ahora - new Date(m.created_at).getTime() <= DOS_DIAS
  const actividad = (mensajes.data ?? []).filter((m) => {
    if (m.tipo === 'incidencia') return true
    if (m.tipo === 'aviso') return m.expira_at ? new Date(m.expira_at).getTime() >= ahora : reciente(m)
    return reciente(m)
  })

  return (
    <div className="min-h-full bg-bg">
      {/* Header compacto claro */}
      <header className="px-4 pb-2 pt-5 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={42} />
            <div>
              <div className="font-display text-[19px] font-extrabold leading-[1.1] text-ink">{saludo()}, {user.nombre.split(' ')[0]}</div>
              <div className="text-[12.5px] text-faint first-letter:uppercase">{fechaLarga}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/buzon" aria-label="Buzón" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink">
              <MessageSquare size={20} strokeWidth={1.9} />
            </Link>
            <Link to="/avisos" aria-label="Avisos" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink">
              <Bell size={20} strokeWidth={1.9} />
              <span className="absolute right-2 top-[7px] h-2 w-2 rounded-full border-[1.5px] border-surface" style={{ background: '#F5B417' }} />
            </Link>
          </div>
        </div>
      </header>

      <div className="px-4 pb-6 pt-2">
        {/* Tablón de la comunidad */}
        <TablonBoard mensajes={actividad} />

        {/* Parking strip (solo cuando toca: dentro del turno o ≤7 días antes) */}
        {parking && (
          <Link to="/parking" className="mt-3.5 flex items-center gap-3 rounded-[16px] px-4 py-[13px] text-white" style={{ background: 'var(--grad-hero)' }}>
            <Car size={26} strokeWidth={1.9} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/65">
                Parking exterior {parking.urgente && <span className="rounded-full bg-white/20 px-1.5 py-px text-[10px]">⏳</span>}
              </div>
              <div className="text-[14.5px]">{parking.texto}</div>
            </div>
            <span className="text-[18px] opacity-70">›</span>
          </Link>
        )}

        {/* Votación slim */}
        {abierta && (
          <Link to={`/votaciones/${abierta.id}`} className="mt-2.5 flex items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-[13px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: '#2F76C9' }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold text-ink">{abierta.titulo}</div>
              <div className="text-[12px] text-faint">Votación abierta · cierra en {diasRestantes(abierta.cierre)} días</div>
            </div>
            <span className="rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ color: 'var(--primary-700)', background: 'var(--primary-soft)' }}>Votar</span>
          </Link>
        )}

        {/* Servicios en círculo */}
        <div className="section-title mb-2.5 mt-[22px]">Servicios</div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
          {servicios.map(({ to, short, Icon, color }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1.5">
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-border bg-surface"
                style={{ boxShadow: '0 4px 10px -5px rgba(30,50,60,.35)', color }}>
                <Icon size={22} strokeWidth={1.9} />
              </span>
              <span className="text-center text-[11px] font-semibold leading-[1.1] text-muted">{short}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
