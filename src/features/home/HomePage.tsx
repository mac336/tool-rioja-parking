import { Link } from 'react-router-dom'
import { Bell, Car, SquareCheckBig, TriangleAlert, CalendarDays, SquareParking, Phone, Leaf, Megaphone } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { saludo, iniciales, fechaCorta, diasRestantes } from '@/lib/format'
import { parkingMisTurnos, listEncuestas, anunciosPrincipales } from '@/lib/api'
import { AnuncioCarousel } from '@/features/anuncios/AnuncioCarousel'
import { Card } from '@/components/ui'

// Tiles "sólido ilustrado": color pleno por módulo (colores de categoría, fijos —
// no siguen la paleta). Icono arriba-izq + marca de agua vectorial abajo-dcha.
const tiles = [
  { to: '/anuncios', label: 'Anuncios', Icon: Megaphone, color: '#E0A22E' },
  { to: '/incidencias', label: 'Incidencias', Icon: TriangleAlert, color: '#E0555F' },
  { to: '/votaciones', label: 'Votaciones', Icon: SquareCheckBig, color: '#5B7FD4' },
  { to: '/reservas', label: 'Reservas', Icon: CalendarDays, color: '#2E8E79' },
  { to: '/parking', label: 'Parking', Icon: SquareParking, color: '#8A6FD1' },
  { to: '/contactos', label: 'Contactos', Icon: Phone, color: '#D98A3D' },
  { to: '/reciclaje', label: 'Reciclaje', Icon: Leaf, color: '#6BAA4E' },
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
      <header className="px-4 pb-6 pt-6 text-white" style={{ background: 'var(--grad-hero)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-white/80">{fechaCorta(new Date().toISOString())}</div>
            <h1 className="font-display text-[26px] font-extrabold">{saludo()}, {user.nombre.split(' ')[0]} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/avisos" aria-label="Avisos" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            </Link>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-[14px] font-bold">{iniciales(user.nombre)}</span>
          </div>
        </div>
      </header>

      <div className="-mt-3 rounded-t-[20px] bg-bg px-4 pt-5">
        <h2 className="overline mb-2">Hoy en tu comunidad</h2>

        {/* Parking (tarjeta oscura) */}
        <Link to="/parking" className="block">
          <div className="relative overflow-hidden rounded-[18px] p-4 text-white shadow-neu" style={{ background: 'var(--grad-hero)' }}>
            <Car size={88} strokeWidth={1.6} className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 text-white/15" />
            <div className="relative z-10 pr-24">
              <div className="overline text-white/60">Tu parking</div>
              {miPlaza
                ? <div className="mt-1 text-[15px]">Esta quincena aparcas en la <b className="text-[19px]">Plaza {miPlaza.plaza}</b></div>
                : <div className="mt-1 text-[15px] text-white/80">Esta quincena no te toca plaza. Mira tus próximos turnos.</div>}
            </div>
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
        <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
          {tiles.map(({ to, label, Icon, color }) => (
            <Link key={to} to={to}
              className="relative flex min-h-[108px] flex-col justify-between overflow-hidden rounded-[18px] p-3.5 text-white shadow-neu-sm transition-shadow active:shadow-neu-inset"
              style={{ background: color }}>
              {/* marca de agua vectorial (mismo icono, grande y translúcido) */}
              <Icon size={82} strokeWidth={1.5} className="pointer-events-none absolute -bottom-3 -right-3 text-white/20" />
              {/* velo inferior para asegurar contraste del texto blanco */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,.28), transparent)' }} />
              {/* icono */}
              <span className="relative flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/25">
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className="relative z-10 text-[14px] font-bold">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
