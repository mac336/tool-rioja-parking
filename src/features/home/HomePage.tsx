import { Link } from 'react-router-dom'
import { Bell, Car, SquareCheckBig, CalendarDays, CalendarRange, PartyPopper, SquareParking, Phone, Megaphone, MessageSquare, Lightbulb, Hourglass, Building2 } from 'lucide-react'
import { useApp } from '@/store'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { saludo, diasRestantes, fechaHora, hora, claveDia } from '@/lib/format'
import { parkingMisTurnos, listEncuestas, listMensajes, listAvisos, reservaVigente, listEventos } from '@/lib/api'
import { contarAvisosNuevos } from '@/lib/avisosVistos'
import { puedePublicarAlgo, puedeVotar, puedeReservar, puedeVerMiComunidad } from '@/lib/roles'
import { Logo } from '@/components/Logo'
import { TablonGadget } from '@/features/mensajes/TablonGadget'
import { GadgetContextual } from '@/features/home/GadgetContextual'
import { seleccionarGadgets, recordatorioCalendario } from '@/features/home/gadgetsHome'

// Servicios (accesos a módulos) en círculo — colores fijos de cada módulo.
// - "Buzón" NO va aquí: está arriba en la cabecera (icono 💬), sería duplicado.
// - "Mensajes" solo para quien PUBLICA (gestión): el vecino solo lee, y ya lo
//   ve en el tablón, así que no necesita el acceso.
// MÁXIMO 8 SERVICIOS (specs/10): la rejilla 4×2 queda llena con Calendario (8ª
// celda). Un 9º servicio exige rediseño o va a "Más".
const servicios = [
  { to: '/mensajes', short: 'Mensajes', Icon: Megaphone, color: '#E0A22E', soloPublica: true },
  { to: '/votaciones', short: 'Votaciones', Icon: SquareCheckBig, color: '#5B7FD4', soloVota: true },
  { to: '/reservas', short: 'Reservas', Icon: CalendarDays, color: '#2E8E79', soloReserva: true },
  { to: '/parking', short: 'Parking', Icon: SquareParking, color: '#8A6FD1' },
  { to: '/contactos', short: 'Contactos', Icon: Phone, color: '#D98A3D' },
  { to: '/sugerencias', short: 'Sugerencias', Icon: Lightbulb, color: '#C879A9' },
  // Visible según permiso 'ver_mi_comunidad' (configurable). Ver specs/19.
  { to: '/mi-comunidad', short: 'Mi Comunidad', Icon: Building2, color: '#2E8E79', soloMiComunidad: true },
  // 8ª y última celda (specs/21): festivos de Madrid + fechas de la comunidad.
  // Visible para TODOS los roles (ver no requiere permiso, solo gestionar).
  { to: '/calendario', short: 'Calendario', Icon: CalendarRange, color: '#D06A5A' },
]

const fechaLarga = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

export function HomePage() {
  const { user } = useApp()
  const turnos = useAsync(parkingMisTurnos, [user.vivienda])
  const encuestas = useAsync(listEncuestas, [], { key: 'encuestas', ttlMs: TTL.encuestas })
  const mensajes = useAsync(listMensajes, [], { key: 'mensajes', ttlMs: TTL.mensajes })
  const eventosCal = useAsync(listEventos, [], { key: 'calendario', ttlMs: TTL.calendario })
  const avisos = useAsync(listAvisos, [], { key: 'avisos', ttlMs: TTL.avisos })
  const reserva = useAsync(reservaVigente, [])
  const nuevos = contarAvisosNuevos(avisos.data ?? [], user.avisos_vistos_at)
  // Mensaje nuevo del buzón: listAvisos añade avisos con destino '/buzon' cuando
  // hay hilos sin leer (respuesta al vecino o mensaje nuevo para la gestión).
  const buzonNuevo = (avisos.data ?? []).some((a) => a.to === '/buzon')

  const abierta = encuestas.data?.find((e) => e.estado === 'abierta')
  const ahora = Date.now()
  const DIA = 864e5

  // Encuesta protagonista (handoff encuesta_home, 2a): hero arriba del tablón
  // mientras el vecino no haya votado del todo; urgente (ámbar) a ≤3 días.
  const yaVoto = !!abierta && abierta.preguntas.every((p) => p.mi_voto_opcion_ids.length > 0)
  // Si el rol no puede votar (permiso), no se le muestra el hero de encuesta.
  const encuestaHero = abierta && !yaVoto && puedeVotar(user.rol) ? abierta : null
  const diasCierre = encuestaHero ? diasRestantes(encuestaHero.cierre) : 0
  const encuestaUrgente = diasCierre <= 3
  const cierraTxt = diasCierre <= 0 ? 'Cierra hoy' : diasCierre === 1 ? 'Cierra mañana' : `Cierra en ${diasCierre} días`
  const pctVotos = encuestaHero && encuestaHero.total_viviendas > 0
    ? Math.round((encuestaHero.viviendas_votantes / encuestaHero.total_viviendas) * 100) : 0

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

  // Bloque contextual con cupo 2 (specs/21): parking > reserva > calendario.
  // El recordatorio de calendario solo entra si parking o reserva dejan hueco.
  const hoy = claveDia(new Date().toISOString())
  const recordatorio = recordatorioCalendario(eventosCal.data, hoy)
  const gadgetsContextuales = seleccionarGadgets<unknown>([
    parking ? { clave: 'parking' as const, prioridad: 1, datos: parking } : null,
    reserva.data ? { clave: 'reserva' as const, prioridad: 2, datos: reserva.data } : null,
    recordatorio ? { clave: 'calendario' as const, prioridad: 3, datos: recordatorio } : null,
  ], 2)

  // Actividad reciente para el tablón: incidencias abiertas; avisos vigentes (o
  // sin caducidad, 2 días); anuncios de los últimos 2 días.
  const DOS_DIAS = 2 * 864e5
  // Fecha de actividad = la más reciente entre creación y edición (mig. 0042):
  // al editar un mensaje "resucita" en Inicio.
  const fechaAct = (m: { created_at: string; updated_at?: string }) =>
    Math.max(new Date(m.created_at).getTime(), m.updated_at ? new Date(m.updated_at).getTime() : 0)
  const reciente = (m: { created_at: string; updated_at?: string }) => ahora - fechaAct(m) <= DOS_DIAS
  // Avisos y anuncios: si tienen caducidad se muestran hasta que caducan; si no,
  // solo mientras son recientes (o se hayan editado).
  const vigenteOReciente = (m: { created_at: string; updated_at?: string; expira_at?: string | null }) =>
    m.expira_at ? new Date(m.expira_at).getTime() >= ahora : reciente(m)
  const actividad = (mensajes.data ?? []).filter((m) => {
    if (m.tipo === 'incidencia' || m.tipo === 'sugerencia') return true
    if (m.tipo === 'aviso' || m.tipo === 'anuncio') return vigenteOReciente(m)
    return reciente(m)
  })

  return (
    // HOME = panel de GADGETS, fijada a la pantalla (sin scroll en móvil):
    //   cabecera → [encuesta] → TABLÓN (elástico: absorbe el hueco libre)
    //   → [parking, solo si toca] → SERVICIOS (pieza clave, SIEMPRE visible
    //   pegada al footer). Todo lo nuevo debe caber en el espacio de arriba;
    //   el panel de servicios no se mueve ni scrollea.
    <div className="flex h-full flex-col overflow-hidden bg-bg px-4">
      {/* Header compacto claro */}
      <header className="shrink-0 pb-2 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={42} />
            <div>
              <div className="font-display text-[19px] font-extrabold leading-[1.1] text-ink">{saludo()}, {user.nombre.split(' ')[0]}</div>
              <div className="text-[12.5px] text-faint first-letter:uppercase">{fechaLarga}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/buzon" aria-label={buzonNuevo ? 'Mensajes (nuevo)' : 'Mensajes'} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink">
              <MessageSquare size={20} strokeWidth={1.9} />
              {buzonNuevo && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-danger" />
              )}
            </Link>
            <Link to="/avisos" aria-label={nuevos > 0 ? `Notificaciones (${nuevos} nuevas)` : 'Notificaciones'} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink">
              <Bell size={20} strokeWidth={1.9} />
              {nuevos > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-extrabold leading-none text-white">
                  {nuevos > 9 ? '9+' : nuevos}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Encuesta protagonista: hero azul (o ámbar si urge) antes del tablón */}
      {encuestaHero && (
          <Link to={`/votaciones/${encuestaHero.id}`}
            aria-label={`${encuestaHero.titulo}, ${cierraTxt.toLowerCase()}, votar ahora`}
            className="mb-2.5 block shrink-0 rounded-[20px] p-4 text-white"
            style={encuestaUrgente
              ? { background: 'linear-gradient(160deg,#C97E2F,color-mix(in srgb,#8A5A0F 80%,#170f00))', boxShadow: '0 14px 30px -14px rgba(207,138,23,.45)' }
              : { background: 'linear-gradient(160deg,#2F76C9,color-mix(in srgb,#1F5AA3 75%,#001217))', boxShadow: '0 14px 30px -14px rgba(47,118,201,.5)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${encuestaUrgente ? 'text-white/75' : 'text-white/70'}`}>Encuesta de la comunidad</span>
              <span className={`inline-flex h-[23px] shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] text-white ${encuestaUrgente ? 'bg-white/20 font-extrabold' : 'bg-white/[.16] font-bold'}`}>
                {encuestaUrgente && <Hourglass size={11} strokeWidth={2.2} />}{cierraTxt}
              </span>
            </div>
            <div className="mt-1.5 font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.015em]">{encuestaHero.titulo}</div>
            <div className="mt-2.5 h-[7px] overflow-hidden rounded-full bg-white/[.22]">
              <div className="h-full rounded-full bg-white transition-[width] duration-200 ease-out" style={{ width: `${pctVotos}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2.5">
              <span className={`text-[12px] ${encuestaUrgente ? 'text-white/90' : 'text-white/85'}`}>
                {encuestaHero.viviendas_votantes}/{encuestaHero.total_viviendas} viviendas han votado
              </span>
              <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-white px-[18px] text-[13px] font-extrabold"
                style={{ color: encuestaUrgente ? '#8A5A0F' : '#1F5AA3' }}>
                Votar ahora
              </span>
            </div>
          </Link>
      )}

      {/* Tablón (gadget elástico: crece/encoge según el hueco de la pantalla) */}
      <TablonGadget mensajes={actividad} className="mb-auto min-h-0 max-h-[300px] flex-1" />

      {/* Gadgets contextuales: parking (si toca) + reserva activa (+ calendario
          en la pasada 2, si hay hueco). Flotan en el hueco entre el tablón y
          los servicios repartiendo el espacio libre; markup compartido en
          GadgetContextual (refactor D1, sin cambio visual). */}
      {gadgetsContextuales.length > 0 && (
        <div className="my-auto flex shrink-0 flex-col gap-2.5">
          {gadgetsContextuales.map((g) => g.clave === 'parking' && parking ? (
            <GadgetContextual key="parking" to="/parking" Icon={Car} gradient="var(--grad-hero)"
              overline={<>Parking exterior {parking.urgente && <span className="rounded-full bg-white/20 px-1.5 py-px text-[10px]">⏳</span>}</>}>
              {parking.texto}
            </GadgetContextual>
          ) : g.clave === 'reserva' && reserva.data ? (
            <GadgetContextual key="reserva" to="/reservas" Icon={CalendarDays} iconSize={24}
              gradient="linear-gradient(150deg,#2E8E79,#123f34)"
              overline="Tu reserva"
              badge={
                <span className="rounded-full bg-white/20 px-1.5 py-px text-[10px] font-extrabold normal-case tracking-normal">
                  {reserva.data.estado === 'aprobada' ? 'Aprobada' : 'Pendiente'}
                </span>
              }>
              <b>{reserva.data.zonas.map((z) => z.nombre).join(' + ')}</b> · {fechaHora(reserva.data.inicio)}–{hora(reserva.data.fin)}
            </GadgetContextual>
          ) : g.clave === 'calendario' && recordatorio ? (
            <GadgetContextual key="calendario" to="/calendario"
              Icon={recordatorio.tipo === 'festivo' ? PartyPopper : CalendarRange}
              gradient="linear-gradient(150deg,#D06A5A,#6B2A22)"
              overline={recordatorio.overline}>
              {recordatorio.tipo === 'festivo'
                ? <>Hoy es festivo: <b>{recordatorio.titulo}</b></>
                : <><b>{recordatorio.titulo}</b> · {recordatorio.detalle}</>}
            </GadgetContextual>
          ) : null)}
        </div>
      )}

      {/* SERVICIOS — PIEZA CLAVE de la Home: siempre visible, pegado al footer,
          NUNCA scrollea. El menú "Más" solo tiene lo que NO está aquí. Si se
          añade algo nuevo a la Home, debe caber en el espacio de arriba. */}
      <section className="shrink-0 pb-5 pt-3">
        <div className="section-title mb-3">Servicios</div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
          {servicios
            .filter((s) => (!s.soloPublica || puedePublicarAlgo(user.rol))
              && (!s.soloMiComunidad || puedeVerMiComunidad(user.rol))
              && (!s.soloVota || puedeVotar(user.rol))
              && (!s.soloReserva || puedeReservar(user.rol)))
            .map(({ to, short, Icon, color }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1.5">
              <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-border bg-surface"
                style={{ boxShadow: '0 4px 10px -5px rgba(30,50,60,.35)', color }}>
                <Icon size={23} strokeWidth={1.9} />
              </span>
              <span className="text-center text-[11px] font-semibold leading-[1.1] text-muted">{short}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
