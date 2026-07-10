// Capa de acceso a datos. Por defecto usa datos mock en memoria (interactivos)
// para poder ver y navegar la app sin backend. Con VITE_DATA_SOURCE=supabase se
// conmutaría al backend real (RLS ya verificada). El wiring completo a Supabase
// de cada endpoint queda como paso posterior — ver todo.md.

import type {
  Profile, Role,
  Encuesta, EncuestaFormato, EncuestaTipo, ZonaComun, Reserva, ReservaGrupo, CrearReservaInput,
  Mensaje, MensajeTipo, Hilo, HiloMensaje,
  Contact, ContactCategory, AccessRequest, ParkingCesion, CesionTipo, ParkingQuincena,
} from '@/types'
import * as mock from '@/mock/data'
import { PISOS, proximasQuincenas, proximosTurnos } from '@/lib/parking'
import { iniciales, fechaCorta } from '@/lib/format'
import { permisosPorDefecto } from '@/lib/roles'

const delay = <T>(v: T, ms = 160): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms))
const uid = (() => { let n = 1000; return () => `gen_${n++}` })()
const now = () => new Date().toISOString()

// ---- Estado en memoria (semilla desde mock; mutable para demo) ---------------
const db = {
  profiles: structuredClone(mock.MOCK_VECINOS) as Profile[],
  encuestas: structuredClone(mock.MOCK_ENCUESTAS) as Encuesta[],
  zonas: structuredClone(mock.MOCK_ZONAS) as ZonaComun[],
  reservas: structuredClone(mock.MOCK_RESERVAS) as Reserva[],
  contactos: structuredClone(mock.MOCK_CONTACTS) as Contact[],
  requests: structuredClone(mock.MOCK_ACCESS_REQUESTS) as AccessRequest[],
  mensajes: [
    { id: 'msg-1', tipo: 'aviso', titulo: 'Corte de agua el martes', cuerpo: 'El martes de 9:00 a 13:00 habrá corte de agua por mantenimiento. Llena garrafas por si acaso.', activo: true, expira_at: new Date(Date.now() + 3 * 864e5).toISOString(), created_at: now() },
    { id: 'msg-2', tipo: 'anuncio', titulo: 'Piscina abierta', cuerpo: 'Ya ha abierto la temporada de piscina. Recuerda ducharte antes de entrar.', activo: true, created_at: now() },
    { id: 'msg-3', tipo: 'incidencia', titulo: 'Ascensor B averiado', cuerpo: 'El ascensor del portal B está averiado. El técnico viene mañana.', activo: true, created_at: now() },
  ] as Mensaje[],
  hilos: [] as Hilo[],
  hiloMensajes: [] as HiloMensaje[],
  cesiones: [] as ParkingCesion[],
}

// ---- Sesión ------------------------------------------------------------------
let currentUser: Profile = structuredClone(mock.MOCK_USER)
export function getUser(): Profile { return currentUser }
export function setUserRole(rol: Role) { currentUser = { ...currentUser, rol } }
export function actualizarNombre(nombre: string): Promise<Profile> {
  currentUser = { ...currentUser, nombre, iniciales: iniciales(nombre) }
  return delay(currentUser)
}
const esGestionActual = () => currentUser.rol !== 'vecino'

// ---- Viviendas ---------------------------------------------------------------
export const listViviendas = () => delay(PISOS)

// ---- Encuestas ---------------------------------------------------------------
export const listEncuestas = () => delay(db.encuestas.slice())
export const getEncuesta = (id: string) => delay(db.encuestas.find((e) => e.id === id) ?? null)

export function votarPregunta(encuestaId: string, preguntaId: string, opcionIds: string[]): Promise<Encuesta> {
  const e = db.encuestas.find((x) => x.id === encuestaId)!
  const q = e.preguntas.find((p) => p.id === preguntaId)!
  const antesTotal = e.preguntas.reduce((n, p) => n + p.mi_voto_opcion_ids.length, 0)
  q.mi_voto_opcion_ids.forEach((oid) => { const o = q.opciones.find((o) => o.id === oid); if (o) o.votos-- })
  opcionIds.forEach((oid) => { const o = q.opciones.find((o) => o.id === oid); if (o) o.votos++ })
  q.mi_voto_opcion_ids = opcionIds
  const despuesTotal = e.preguntas.reduce((n, p) => n + p.mi_voto_opcion_ids.length, 0)
  if (antesTotal === 0 && despuesTotal > 0) e.viviendas_votantes++
  if (antesTotal > 0 && despuesTotal === 0) e.viviendas_votantes--
  return delay(e)
}

export function crearEncuesta(input: {
  titulo: string; descripcion?: string; cierre: string; formato: EncuestaFormato
  preguntas: { texto: string; tipo: EncuestaTipo; opciones: string[] }[]
}): Promise<Encuesta> {
  const e: Encuesta = {
    id: uid(), titulo: input.titulo, descripcion: input.descripcion, formato: input.formato,
    apertura: now(), cierre: input.cierre, estado: 'abierta', creada_por_nombre: currentUser.nombre,
    total_viviendas: 41, viviendas_votantes: 0,
    preguntas: input.preguntas.map((p) => ({
      id: uid(), texto: p.texto, tipo: p.tipo, mi_voto_opcion_ids: [],
      opciones: p.opciones.map((t) => ({ id: uid(), texto: t, votos: 0 })),
    })),
  }
  db.encuestas.unshift(e)
  return delay(e)
}

export function cerrarEncuesta(id: string): Promise<void> {
  const e = db.encuestas.find((x) => x.id === id)
  if (e) { e.estado = 'cerrada'; e.cierre = now() }
  return delay(undefined)
}
export function borrarEncuesta(id: string): Promise<void> {
  db.encuestas = db.encuestas.filter((e) => e.id !== id)
  return delay(undefined)
}

// ---- Zonas y reservas (multi-zona: N filas comparten grupo_id) ---------------
export const listZonas = () => delay(db.zonas.filter((z) => z.activa))

const claveGrupo = (r: Reserva) => r.grupo_id ?? r.id
const solapa = (aIni: string, aFin: string, bIni: string, bFin: string) =>
  new Date(aIni).getTime() < new Date(bFin).getTime() && new Date(bIni).getTime() < new Date(aFin).getTime()

/** Colapsa filas de reservas en grupos (un grupo = un horario, 1..n zonas). */
function agrupar(rows: Reserva[]): ReservaGrupo[] {
  const porGrupo = new Map<string, Reserva[]>()
  for (const r of rows) {
    const k = claveGrupo(r)
    if (!porGrupo.has(k)) porGrupo.set(k, [])
    porGrupo.get(k)!.push(r)
  }
  return [...porGrupo.entries()].map(([grupo_id, rs]) => {
    const base = rs[0]
    return {
      grupo_id,
      ids: rs.map((r) => r.id),
      zonas: rs.map((r) => ({ id: r.zona_id, nombre: r.zona_nombre })),
      vivienda: base.vivienda,
      solicitada_por: base.solicitada_por,
      inicio: base.inicio,
      fin: base.fin,
      num_invitados: base.num_invitados,
      estado: base.estado,
      motivo_rechazo: base.motivo_rechazo,
      created_at: base.created_at,
    } as ReservaGrupo
  })
}

export const misReservas = (): Promise<ReservaGrupo[]> =>
  delay(agrupar(db.reservas.filter((r) => r.solicitada_por === currentUser.id))
    .sort((a, b) => b.inicio.localeCompare(a.inicio)))

/** Grupo de reserva vigente de la vivienda (pendiente/aprobada, fin>=ahora). */
export function reservaVigente(): Promise<ReservaGrupo | null> {
  const t = Date.now()
  const vivas = db.reservas.filter((r) => r.vivienda === currentUser.vivienda
    && (r.estado === 'pendiente' || r.estado === 'aprobada') && new Date(r.fin).getTime() >= t)
  const grupos = agrupar(vivas).sort((a, b) => a.inicio.localeCompare(b.inicio))
  return delay(grupos[0] ?? null)
}

export function ocupacionZonaDia(zonaId: string, fechaISO: string): Promise<{ inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[]> {
  const dia = fechaISO.slice(0, 10)
  const franjas = db.reservas
    .filter((r) => r.zona_id === zonaId && (r.estado === 'pendiente' || r.estado === 'aprobada') && r.inicio.slice(0, 10) === dia)
    .map((r) => ({ inicio: r.inicio, fin: r.fin, estado: r.estado as 'pendiente' | 'aprobada' }))
  return delay(franjas)
}

/** Ocupación de TODAS las zonas en un día (para validar varias zonas a la vez). */
export function ocupacionDia(fechaISO: string): Promise<{ zona_id: string; inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[]> {
  const dia = fechaISO.slice(0, 10)
  const franjas = db.reservas
    .filter((r) => (r.estado === 'pendiente' || r.estado === 'aprobada') && r.inicio.slice(0, 10) === dia)
    .map((r) => ({ zona_id: r.zona_id, inicio: r.inicio, fin: r.fin, estado: r.estado as 'pendiente' | 'aprobada' }))
  return delay(franjas)
}

export function crearReserva(input: CrearReservaInput): Promise<ReservaGrupo> {
  if (input.zonaIds.length === 0) return Promise.reject(new Error('Selecciona al menos una zona.'))
  // Valida solape por zona (emula el constraint reservas_no_solapan de la BD).
  const ocupadas: string[] = []
  for (const zonaId of input.zonaIds) {
    const choca = db.reservas.some((r) => r.zona_id === zonaId
      && (r.estado === 'pendiente' || r.estado === 'aprobada')
      && solapa(input.inicio, input.fin, r.inicio, r.fin))
    if (choca) ocupadas.push(db.zonas.find((z) => z.id === zonaId)?.nombre ?? zonaId)
  }
  if (ocupadas.length > 0) {
    return Promise.reject(new Error(`Ese horario ya está ocupado en: ${ocupadas.join(', ')}.`))
  }
  const grupo_id = uid()
  const filas = input.zonaIds.map((zonaId) => {
    const zona = db.zonas.find((z) => z.id === zonaId)!
    const r: Reserva = {
      id: uid(), grupo_id, zona_id: zonaId, zona_nombre: zona.nombre, vivienda: currentUser.vivienda,
      solicitada_por: currentUser.id, inicio: input.inicio, fin: input.fin, num_invitados: input.numInvitados,
      estado: 'pendiente', created_at: now(),
    }
    db.reservas.push(r)
    return r
  })
  return delay(agrupar(filas)[0])
}

/** Cancela un grupo entero (todas sus zonas). */
export function cancelarReserva(grupoId: string): Promise<void> {
  for (const r of db.reservas) if (claveGrupo(r) === grupoId) r.estado = 'cancelada'
  return delay(undefined)
}

// La cola del presidente ve los grupos pendientes; resolver afecta al grupo entero.
export const reservasPendientesGestion = (): Promise<ReservaGrupo[]> =>
  delay(agrupar(db.reservas.filter((r) => r.estado === 'pendiente'))
    .map((g) => ({ ...g, nombre: nombreDe(g.solicitada_por) }))
    .sort((a, b) => a.inicio.localeCompare(b.inicio)))

export function resolverReserva(grupoId: string, aprobar: boolean, motivo?: string): Promise<void> {
  for (const r of db.reservas) {
    if (claveGrupo(r) !== grupoId) continue
    r.estado = aprobar ? 'aprobada' : 'rechazada'
    r.motivo_rechazo = motivo
    r.aprobada_por = currentUser.id
  }
  return delay(undefined)
}
const nombreDe = (id: string) => db.profiles.find((p) => p.id === id)?.nombre ?? '—'

// ---- Parking -----------------------------------------------------------------
export function parkingProximas(n = 5): Promise<ParkingQuincena[]> { return delay(proximasQuincenas(n)) }
export function parkingMisTurnos(): Promise<ReturnType<typeof proximosTurnos>> {
  return delay(proximosTurnos(currentUser.vivienda))
}
export const listCesiones = () => delay(db.cesiones.slice())
export const misCesiones = () => delay(db.cesiones.filter((c) => c.vivienda === currentUser.vivienda))
export const cesionesActivas = () => delay(db.cesiones.filter((c) => c.estado === 'activa'))

export function crearCesion(input: { tipo: CesionTipo; desde: string; hasta: string; nota?: string }): Promise<ParkingCesion> {
  const c: ParkingCesion = {
    id: uid(), vivienda: currentUser.vivienda, tipo: input.tipo, desde: input.desde, hasta: input.hasta,
    nota: input.nota, estado: 'activa', created_at: now(),
  }
  db.cesiones.push(c)
  return delay(c)
}
export function cancelarCesion(id: string): Promise<void> {
  const c = db.cesiones.find((c) => c.id === id)
  if (c && c.estado === 'activa') c.estado = 'cancelada'
  return delay(undefined)
}
export function reasignarCesion(id: string, viviendaDestino: string): Promise<void> {
  const c = db.cesiones.find((c) => c.id === id)
  if (c && c.estado === 'activa') { c.estado = 'reasignada'; c.reasignada_a = viviendaDestino; c.gestionada_por = currentUser.id }
  return delay(undefined)
}
export function demandaParking(): Promise<{ necesitan: number; ceden: number }> {
  const necesitan = new Set(db.cesiones.filter((c) => c.tipo === 'necesita' && c.estado === 'activa').map((c) => c.vivienda)).size
  const ceden = new Set(db.cesiones.filter((c) => c.tipo !== 'necesita' && c.estado === 'activa').map((c) => c.vivienda)).size
  return delay({ necesitan, ceden })
}

// ---- Contactos (CRUD admin) --------------------------------------------------
export const listContactos = () => delay(db.contactos.slice().sort((a, b) => a.orden - b.orden))
export function crearContacto(input: Omit<Contact, 'id'>): Promise<Contact> {
  const c: Contact = { id: uid(), ...input }
  db.contactos.push(c)
  return delay(c)
}
export function editarContacto(id: string, input: Partial<Omit<Contact, 'id'>>): Promise<void> {
  const c = db.contactos.find((c) => c.id === id)
  if (c) Object.assign(c, input)
  return delay(undefined)
}
export function borrarContacto(id: string): Promise<void> {
  db.contactos = db.contactos.filter((c) => c.id !== id)
  return delay(undefined)
}
export type { ContactCategory }

// ---- Solicitudes de acceso ---------------------------------------------------
export const listAccessRequests = () => delay(db.requests.filter((r) => r.estado === 'pendiente'))
export function resolverSolicitud(id: string, aprobar: boolean, _vivienda?: string, _rol?: Role): Promise<void> {
  const r = db.requests.find((r) => r.id === id)
  if (r) r.estado = aprobar ? 'aprobada' : 'rechazada'
  return delay(undefined)
}
export function crearSolicitud(input: { nombre: string; email: string; vivienda: string; comentario?: string }): Promise<void> {
  db.requests.push({ id: uid(), ...input, estado: 'pendiente', created_at: now() })
  return delay(undefined)
}

// ---- Vecinos (gestión de usuarios) -------------------------------------------
export const listVecinos = () => delay(db.profiles.slice())
export function suspenderVecino(id: string, suspender: boolean): Promise<void> {
  const p = db.profiles.find((p) => p.id === id)
  if (p) p.estado = suspender ? 'suspendido' : 'activo'
  return delay(undefined)
}
export function cambiarRolVecino(id: string, rol: Role): Promise<void> {
  const p = db.profiles.find((p) => p.id === id)
  if (p) p.rol = rol
  return delay(undefined)
}
export function editarVecino(id: string, patch: { nombre?: string; vivienda?: string }): Promise<void> {
  const p = db.profiles.find((p) => p.id === id)
  if (p) {
    if (patch.nombre !== undefined) { p.nombre = patch.nombre; p.iniciales = iniciales(patch.nombre) }
    if (patch.vivienda !== undefined) p.vivienda = patch.vivienda
  }
  return delay(undefined)
}
export function darDeBajaVecino(id: string): Promise<void> {
  const p = db.profiles.find((p) => p.id === id)
  if (p) p.estado = 'baja'
  return delay(undefined)
}

// ---- Permisos por rol (personalizables) --------------------------------------
const permisosSet = new Set<string>(permisosPorDefecto().map((x) => `${x.rol}|${x.permiso}`))
export function listRolePermisos(): Promise<{ rol: Role; permiso: string }[]> {
  return delay([...permisosSet].map((k) => { const [rol, permiso] = k.split('|'); return { rol: rol as Role, permiso } }))
}
export function setRolePermiso(rol: Role, permiso: string, on: boolean): Promise<void> {
  const k = `${rol}|${permiso}`
  if (on) permisosSet.add(k); else permisosSet.delete(k)
  return delay(undefined)
}

// ---- Sugerencias (demo: no envía correo, solo simula) ------------------------
export function enviarSugerencia(_texto: string): Promise<void> {
  return delay(undefined)
}

// ---- Push (demo: no persiste nada) -------------------------------------------
export function guardarSuscripcionPush(_sub: PushSubscriptionJSON, _ua: string): Promise<void> {
  return delay(undefined)
}
export function quitarSuscripcionPush(_endpoint: string): Promise<void> {
  return delay(undefined)
}

// ---- Mensajes públicos (demo) ------------------------------------------------
export const listMensajes = () => delay(db.mensajes.filter((m) => m.activo).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)))
type MensajeInput = { tipo: MensajeTipo; titulo: string; cuerpo: string; expira_at?: string | null; firma?: string | null }
export function crearMensaje(input: MensajeInput): Promise<Mensaje> {
  const m: Mensaje = { id: uid(), tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo, expira_at: input.expira_at ?? null, firma: input.firma ?? null, created_by: currentUser.id, activo: true, created_at: now() }
  db.mensajes.unshift(m)
  return delay(m)
}
export function editarMensaje(id: string, input: MensajeInput): Promise<void> {
  const m = db.mensajes.find((x) => x.id === id)
  if (m) Object.assign(m, { ...input, expira_at: input.expira_at ?? null, firma: input.firma ?? null })
  return delay(undefined)
}
export function borrarMensaje(id: string): Promise<void> {
  db.mensajes = db.mensajes.filter((m) => m.id !== id)
  return delay(undefined)
}

// ---- Buzón privado (demo) ----------------------------------------------------
export const misHilos = () => delay(db.hilos.filter((h) => h.vecino_id === currentUser.id).slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
export const hilosGestion = () => delay(db.hilos.slice().map((h) => ({ ...h, vecino_nombre: nombreDe(h.vecino_id), vecino_vivienda: db.profiles.find((p) => p.id === h.vecino_id)?.vivienda ?? '' })).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
export function getHilo(id: string): Promise<{ hilo: Hilo; mensajes: HiloMensaje[] } | null> {
  const hilo = db.hilos.find((h) => h.id === id)
  if (!hilo) return delay(null)
  const soyDueño = hilo.vecino_id === currentUser.id
  if (soyDueño) hilo.no_leido_vecino = false; else hilo.no_leido_gestion = false
  const mensajes = db.hiloMensajes.filter((m) => m.hilo_id === id).map((m) => ({ ...m, autor_nombre: nombreDe(m.autor_id) }))
  return delay({ hilo, mensajes })
}
export function crearHilo(input: { asunto: string; texto: string }): Promise<string> {
  const id = uid()
  db.hilos.unshift({ id, vecino_id: currentUser.id, asunto: input.asunto, estado: 'abierto', no_leido_gestion: true, no_leido_vecino: false, created_at: now(), updated_at: now() })
  db.hiloMensajes.push({ id: uid(), hilo_id: id, autor_id: currentUser.id, de_gestion: esGestionActual(), texto: input.texto, created_at: now() })
  return delay(id)
}
export function responderHilo(hiloId: string, texto: string): Promise<void> {
  const gestion = esGestionActual()
  db.hiloMensajes.push({ id: uid(), hilo_id: hiloId, autor_id: currentUser.id, de_gestion: gestion, texto, created_at: now() })
  const h = db.hilos.find((x) => x.id === hiloId)
  if (h) { h.updated_at = now(); h.estado = 'abierto'; if (gestion) h.no_leido_vecino = true; else h.no_leido_gestion = true }
  return delay(undefined)
}
export function cerrarHilo(hiloId: string, cerrar = true): Promise<void> {
  const h = db.hilos.find((x) => x.id === hiloId)
  if (h) h.estado = cerrar ? 'cerrado' : 'abierto'
  return delay(undefined)
}
export function convertirEnMensaje(_hiloId: string, input: { tipo: MensajeTipo; titulo: string; cuerpo: string }): Promise<void> {
  db.mensajes.unshift({ id: uid(), tipo: input.tipo, titulo: input.titulo, cuerpo: input.cuerpo, created_by: currentUser.id, activo: true, created_at: now() })
  return delay(undefined)
}

// ---- Avisos (feed para la campana) -------------------------------------------
export interface Aviso { id: string; texto: string; cuando: string; to: string }
export function listAvisos(): Promise<Aviso[]> {
  const avisos: Aviso[] = []
  const abierta = db.encuestas.find((e) => e.estado === 'abierta')
  if (abierta) avisos.push({ id: 'av-enc', texto: `Votación abierta: ${abierta.titulo}`, cuando: 'Ahora', to: `/votaciones/${abierta.id}` })
  for (const m of db.mensajes.filter((x) => x.activo).slice(0, 3)) {
    const etiqueta = m.tipo === 'aviso' ? 'Aviso' : m.tipo === 'anuncio' ? 'Anuncio' : 'Incidencia'
    avisos.push({ id: `av-msg-${m.id}`, texto: `${etiqueta}: ${m.titulo}`, cuando: fechaCorta(m.created_at), to: '/mensajes' })
  }
  const miReserva = db.reservas.find((r) => r.solicitada_por === currentUser.id && r.estado === 'aprobada')
  if (miReserva) avisos.push({ id: 'av-res', texto: `Tu reserva de ${miReserva.zona_nombre} está aprobada`, cuando: fechaCorta(miReserva.inicio), to: '/reservas/mias' })
  if (esGestionActual()) {
    const pendRes = db.reservas.filter((r) => r.estado === 'pendiente').length
    if (pendRes) avisos.push({ id: 'av-modres', texto: `${pendRes} reserva(s) por aprobar`, cuando: 'Pendiente', to: '/reservas' })
  }
  return delay(avisos)
}

export { iniciales }
