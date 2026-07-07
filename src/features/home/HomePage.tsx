import { Link } from 'react-router-dom'
import { Bell, Car, SquareCheckBig, TriangleAlert, CalendarDays, SquareParking, Phone, Leaf, Megaphone } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { saludo, iniciales, fechaCorta, diasRestantes } from '@/lib/format'
import { parkingMisTurnos, listEncuestas, anunciosPrincipales } from '@/lib/api'
import { AnuncioCarousel } from '@/features/anuncios/AnuncioCarousel'
import { Card } from '@/components/ui'

const tiles = [
  { to: '/anuncios', label: 'Anuncios', Icon: Megaphone, bg: '#FFE4DB', fg: '#D9542B' },
  { to: '/incidencias', label: 'Incidencias', Icon: TriangleAlert, bg: '#FFE4DB', fg: '#D9542B' },
  { to: '/votaciones', label: 'Votaciones', Icon: SquareCheckBig, bg: '#DFEDFC', fg: '#2F76C9' },
  { to: '/reservas', label: 'Reservas', Icon: CalendarDays, bg: '#DCF5E8', fg: '#0B7E52' },
  { to: '/parking', label: 'Parking', Icon: SquareParking, bg: '#EAE5FA', fg: '#7059C9' },
  { to: '/contactos', label: 'Contactos', Icon: Phone, bg: '#FFF0D0', fg: '#A87414' },
  { to: '/reciclaje', label: 'Reciclaje', Icon: Leaf, bg: '#E5F4D9', fg: '#58991F' },
]

export function HomePage() {
  const { user } = useApp()
  const turnos = useAsync(parkingMisTurnos, [user.vivienda])
  const encuestas = useAsync(listEncuestas, [])
  const principales = useAsync(anunciosPrincipales, [])

  const miPlaza = turnos.data?.find((t) => t.actual)
  const abierta = encuestas.data?.find((e) => e.estado === 'abierta')

  return (
    <div>
      {/* Header con degradado */}
      <header className="px-4 pb-6 pt-6 text-white" style={{ background: 'linear-gradient(160deg,#10A26C,#0B7E52)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-white/80">{fechaCorta(new Date().toISOString())}</div>
            <h1 className="font-display text-[26px] font-extrabold">{saludo()}, {user.nombre.split(' ')[0]} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Avisos" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            </button>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-[14px] font-bold">{iniciales(user.nombre)}</span>
          </div>
        </div>
      </header>

      <div className="-mt-3 rounded-t-[20px] bg-bg px-4 pt-5">
        <h2 className="overline mb-2">Hoy en tu comunidad</h2>

        {/* Parking (tarjeta oscura) */}
        <Link to="/parking" className="block">
          <div className="relative overflow-hidden rounded-[16px] bg-[#132520] p-4 text-white">
            <Car size={92} className="absolute -right-3 -top-2 text-accent/25" />
            <div className="overline text-white/60">Tu parking</div>
            {miPlaza
              ? <div className="mt-1 text-[15px]">Esta quincena aparcas en la <b className="text-[19px]">Plaza {miPlaza.plaza}</b></div>
              : <div className="mt-1 text-[15px] text-white/80">Esta quincena no te toca plaza. Mira tus próximos turnos.</div>}
          </div>
        </Link>

        {/* Votación + Anuncio destacado */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {abierta && (
            <Link to={`/votaciones/${abierta.id}`}>
              <Card className="h-full">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-info"><span className="h-2 w-2 rounded-full bg-info" /> Votación abierta</div>
                <div className="mt-1 text-[15px] font-semibold text-ink">{abierta.titulo}</div>
                <div className="mt-1 text-[12px] text-muted">cierra en {diasRestantes(abierta.cierre)} días</div>
              </Card>
            </Link>
          )}
          {principales.data && principales.data.length > 0 && (
            <div className="sm:col-span-1"><AnuncioCarousel anuncios={principales.data} compact /></div>
          )}
        </div>

        {/* Tiles */}
        <h2 className="overline mb-2 mt-6">¿Qué necesitas?</h2>
        <div className="grid grid-cols-3 gap-3 pb-4">
          {tiles.map(({ to, label, Icon, bg, fg }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-2 rounded-[16px] border border-border bg-surface p-3 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: bg, color: fg }}>
                <Icon size={24} strokeWidth={1.9} />
              </span>
              <span className="text-[12px] font-semibold text-ink">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
