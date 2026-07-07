// Capa de acceso a datos. Por defecto usa datos mock en memoria (interactivos)
// para poder ver y navegar la app sin backend. Con VITE_DATA_SOURCE=supabase se
// conmutaría al backend real (RLS ya verificada). El wiring completo a Supabase
// de cada endpoint queda como paso posterior — ver todo.md.

import type {
  Profile, Role, Incident, IncidentComment, IncidentStatus, IncidentCategory,
  Encuesta, EncuestaFormato, EncuestaTipo, ZonaComun, Reserva, Anuncio, AnuncioNivel,
  Contact, ContactCategory, AccessRequest, ParkingCesion, CesionTipo, ParkingQuincena,
} from '@/types'
import * as mock from '@/mock/data'
import { PISOS, proximasQuincenas, proximosTurnos } from '@/lib/parking'
import { iniciales, fechaCorta } from '@/lib/format'

const delay = <T>(v: T, ms = 160): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms))
const uid = (() => { let n = 1000; return () => `gen_${n++}` })()
const now = () => new Date().toISOString()

// ---- Estado en memoria (semilla desde mock; mutable para demo) ---------------
const db = {
  profiles: structuredClone(mock.MOCK_VECINOS) as Profile[],
  incidencias: structuredClone(mock.MOCK_INCIDENTS) as Incident[],
  encuestas: structuredClone(mock.MOCK_ENCUESTAS) as Encuesta[],
  zonas: structuredClone(mock.MOCK_ZONAS) as ZonaComun[],
  reservas: structuredClone(mock.MOCK_RESERVAS) as Reserva[],
  anuncios: structuredClone([...mock.MOCK_ANUNCIOS, ...mock.MOCK_ANUNCIOS_PENDIENTES]) as Anuncio[],
  contactos: structuredClone(mock.MOCK_CONTACTS) as Contact[],
  requests: structuredClone(mock.MOCK_ACCESS_REQUESTS) as AccessRequest[],
  cesiones: [] as ParkingCesion[],
  reportes: [] as { id: string; entidad_id: string; entidad_titulo: string; autor: string; motivo: string; created_at: string }[],
  viviendasBloqueadas: new Set<string>(),
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

// ---- Incidencias -------------------------------------------------------------
export const listIncidencias = () => delay(db.incidencias.slice())
export const getIncidencia = (id: string) => delay(db.incidencias.find((i) => i.id === id) ?? null)

export function crearIncidencia(input: {
  titulo: string; descripcion: string; categoria: IncidentCategory; ubicacion?: string; fotos?: string[]
}): Promise<Incident> {
  const inc: Incident = {
    id: uid(), autor_id: currentUser.id, autor_nombre: `${currentUser.nombre} (${currentUser.vivienda})`,
    autor_vivienda: currentUser.vivienda, titulo: input.titulo, descripcion: input.descripcion,
    categoria: input.categoria, ubicacion: input.ubicacion, estado: 'abierta', comentarios_bloqueados: false,
    fotos: input.fotos ?? [], comentarios: [],
    eventos: [{ id: uid(), estado_anterior: null, estado_nuevo: 'abierta', actor_nombre: currentUser.nombre, created_at: now() }],
    created_at: now(),
  }
  db.incidencias.unshift(inc)
  return delay(inc)
}

export function editarIncidencia(id: string, input: {
  titulo: string; descripcion: string; categoria: IncidentCategory; ubicacion?: string
}): Promise<Incident> {
  const inc = db.incidencias.find((i) => i.id === id)!
  Object.assign(inc, input)
  return delay(inc)
}

export function borrarIncidencia(id: string): Promise<void> {
  db.incidencias = db.incidencias.filter((i) => i.id !== id)
  return delay(undefined)
}

export function comentarIncidencia(id: string, texto: string): Promise<IncidentComment> {
  const inc = db.incidencias.find((i) => i.id === id)!
  const c: IncidentComment = {
    id: uid(), autor_id: currentUser.id, autor_nombre: currentUser.nombre, autor_rol: currentUser.rol,
    texto, oculto: false, created_at: now(),
  }
  inc.comentarios.push(c)
  return delay(c)
}

export function ocultarComentario(incId: string, comId: string, oculto = true): Promise<void> {
  const inc = db.incidencias.find((i) => i.id === incId)
  const c = inc?.comentarios.find((x) => x.id === comId)
  if (c) c.oculto = oculto
  return delay(undefined)
}

export function bloquearComentarios(id: string, bloqueado: boolean): Promise<void> {
  const inc = db.incidencias.find((i) => i.id === id)
  if (inc) inc.comentarios_bloqueados = bloqueado
  return delay(undefined)
}

export function cambiarEstadoIncidencia(id: string, estado: IncidentStatus): Promise<Incident> {
  const inc = db.incidencias.find((i) => i.id === id)!
  inc.eventos.push({ id: uid(), estado_anterior: inc.estado, estado_nuevo: estado, actor_nombre: currentUser.nombre, created_at: now() })
  inc.estado = estado
  return delay(inc)
}

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

// ---- Zonas y reservas (UNA sola lista: crear → aprobar conectado) ------------
export const listZonas = () => delay(db.zonas.filter((z) => z.activa))
export const misReservas = () => delay(db.reservas.filter((r) => r.solicitada_por === currentUser.id))

export function reservaVigente(): Promise<Reserva | null> {
  const t = Date.now()
  const r = db.reservas.find((r) => r.vivienda === currentUser.vivienda
    && (r.estado === 'pendiente' || r.estado === 'aprobada') && new Date(r.fin).getTime() >= t)
  return delay(r ?? null)
}

export function ocupacionZonaDia(zonaId: string, fechaISO: string): Promise<{ inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[]> {
  const dia = fechaISO.slice(0, 10)
  const franjas = db.reservas
    .filter((r) => r.zona_id === zonaId && (r.estado === 'pendiente' || r.estado === 'aprobada') && r.inicio.slice(0, 10) === dia)
    .map((r) => ({ inicio: r.inicio, fin: r.fin, estado: r.estado as 'pendiente' | 'aprobada' }))
  return delay(franjas)
}

export function crearReserva(input: { zonaId: string; inicio: string; fin: string; numInvitados: number }): Promise<Reserva> {
  const zona = db.zonas.find((z) => z.id === input.zonaId)!
  const r: Reserva = {
    id: uid(), zona_id: input.zonaId, zona_nombre: zona.nombre, vivienda: currentUser.vivienda,
    solicitada_por: currentUser.id, inicio: input.inicio, fin: input.fin, num_invitados: input.numInvitados,
    estado: 'pendiente', created_at: now(),
  }
  db.reservas.push(r)
  return delay(r)
}

export function cancelarReserva(id: string): Promise<void> {
  const r = db.reservas.find((r) => r.id === id)
  if (r) r.estado = 'cancelada'
  return delay(undefined)
}

// La cola del presidente ve las pendientes REALES; resolver se refleja en Mis reservas.
export const reservasPendientesGestion = () =>
  delay(db.reservas.filter((r) => r.estado === 'pendiente').map((r) => ({ ...r, nombre: nombreDe(r.solicitada_por) })))
export function resolverReserva(id: string, aprobar: boolean, motivo?: string): Promise<void> {
  const r = db.reservas.find((r) => r.id === id)
  if (r) { r.estado = aprobar ? 'aprobada' : 'rechazada'; r.motivo_rechazo = motivo; r.aprobada_por = currentUser.id }
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

// ---- Anuncios ----------------------------------------------------------------
const hoyISO = () => new Date().toISOString().slice(0, 10)
const vigente = (a: Anuncio) => a.estado === 'publicado' && a.fecha_inicio <= hoyISO() && a.fecha_fin >= hoyISO()
export const anunciosPrincipales = () => delay(db.anuncios.filter((a) => vigente(a) && a.nivel === 'principal'))
export const anunciosListado = () => delay(db.anuncios.filter(vigente))
export const misAnuncios = () => delay(db.anuncios.filter((a) => a.autor_id === currentUser.id))

export const viviendaPuedePublicar = () => delay(!db.viviendasBloqueadas.has(currentUser.vivienda))

export function crearAnuncio(input: {
  titulo: string; cuerpo: string; fechaInicio: string; fechaFin: string; nivelSolicitado: AnuncioNivel
}): Promise<Anuncio> {
  if (db.viviendasBloqueadas.has(currentUser.vivienda)) {
    return Promise.reject(new Error('Tu vivienda está bloqueada para publicar anuncios.'))
  }
  const a: Anuncio = {
    id: uid(), autor_id: currentUser.id, autor_nombre: currentUser.nombre, vivienda: currentUser.vivienda,
    titulo: input.titulo, cuerpo: input.cuerpo, fecha_inicio: input.fechaInicio, fecha_fin: input.fechaFin,
    revision_larga: false, nivel_solicitado: input.nivelSolicitado, nivel: null, estado: 'pendiente', created_at: now(),
  }
  db.anuncios.unshift(a)
  return delay(a)
}

export function editarAnuncio(id: string, input: {
  titulo: string; cuerpo: string; fechaInicio: string; fechaFin: string; nivelSolicitado: AnuncioNivel
}): Promise<Anuncio> {
  const a = db.anuncios.find((x) => x.id === id)!
  Object.assign(a, {
    titulo: input.titulo, cuerpo: input.cuerpo,
    fecha_inicio: input.fechaInicio, fecha_fin: input.fechaFin, nivel_solicitado: input.nivelSolicitado,
  })
  return delay(a)
}
export function borrarAnuncio(id: string): Promise<void> {
  db.anuncios = db.anuncios.filter((a) => a.id !== id)
  return delay(undefined)
}

export const anunciosPendientesGestion = () => delay(db.anuncios.filter((a) => a.estado === 'pendiente'))
export function resolverAnuncio(id: string, accion: 'publicar' | 'rechazar', nivel?: AnuncioNivel, motivo?: string): Promise<void> {
  const a = db.anuncios.find((x) => x.id === id)
  if (!a) return delay(undefined)
  if (accion === 'publicar') { a.estado = 'publicado'; a.nivel = nivel ?? a.nivel_solicitado; a.publicado_at = now(); a.aprobado_por = currentUser.id }
  else { a.estado = 'rechazado'; a.motivo_rechazo = motivo; a.aprobado_por = currentUser.id }
  return delay(undefined)
}
/** Mover un anuncio publicado entre principal/secundario (gestión). */
export function moverNivelAnuncio(id: string, nivel: AnuncioNivel): Promise<void> {
  const a = db.anuncios.find((x) => x.id === id)
  if (a && a.estado === 'publicado') a.nivel = nivel
  return delay(undefined)
}
/** Despublicar/archivar un anuncio publicado (gestión). */
export function despublicarAnuncio(id: string): Promise<void> {
  const a = db.anuncios.find((x) => x.id === id)
  if (a) a.estado = 'archivado'
  return delay(undefined)
}

// Reportes de contenido (vecinos) + cola de gestión
export function reportarAnuncio(anuncioId: string, motivo: string): Promise<void> {
  const a = db.anuncios.find((x) => x.id === anuncioId)
  db.reportes.push({ id: uid(), entidad_id: anuncioId, entidad_titulo: a?.titulo ?? '—', autor: currentUser.nombre, motivo, created_at: now() })
  return delay(undefined)
}
export const listReportes = () => delay(db.reportes.slice())
export function descartarReporte(id: string): Promise<void> {
  db.reportes = db.reportes.filter((r) => r.id !== id)
  return delay(undefined)
}

// Bloqueo de viviendas para publicar (presidente/adm.finca/app_admin)
export const listViviendasBloqueadas = () => delay([...db.viviendasBloqueadas])
export function bloquearVivienda(vivienda: string, bloquear: boolean): Promise<void> {
  if (bloquear) db.viviendasBloqueadas.add(vivienda)
  else db.viviendasBloqueadas.delete(vivienda)
  return delay(undefined)
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
export function resolverSolicitud(id: string, aprobar: boolean): Promise<void> {
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

// ---- Avisos (feed para la campana) -------------------------------------------
export interface Aviso { id: string; texto: string; cuando: string; to: string }
export function listAvisos(): Promise<Aviso[]> {
  const avisos: Aviso[] = []
  const abierta = db.encuestas.find((e) => e.estado === 'abierta')
  if (abierta) avisos.push({ id: 'av-enc', texto: `Votación abierta: ${abierta.titulo}`, cuando: 'Ahora', to: `/votaciones/${abierta.id}` })
  const principal = db.anuncios.find((a) => vigente(a) && a.nivel === 'principal')
  if (principal) avisos.push({ id: 'av-anun', texto: `Nuevo anuncio destacado: ${principal.titulo}`, cuando: fechaCorta(principal.publicado_at ?? principal.created_at), to: '/anuncios' })
  const miReserva = db.reservas.find((r) => r.solicitada_por === currentUser.id && r.estado === 'aprobada')
  if (miReserva) avisos.push({ id: 'av-res', texto: `Tu reserva de ${miReserva.zona_nombre} está aprobada`, cuando: fechaCorta(miReserva.inicio), to: '/reservas/mias' })
  if (esGestionActual()) {
    const pend = db.anuncios.filter((a) => a.estado === 'pendiente').length
    const pendRes = db.reservas.filter((r) => r.estado === 'pendiente').length
    if (pend) avisos.push({ id: 'av-mod', texto: `${pend} anuncio(s) esperando moderación`, cuando: 'Pendiente', to: '/anuncios' })
    if (pendRes) avisos.push({ id: 'av-modres', texto: `${pendRes} reserva(s) por aprobar`, cuando: 'Pendiente', to: '/reservas' })
  }
  return delay(avisos)
}

export { iniciales }
