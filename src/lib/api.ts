// Capa de acceso a datos. Por defecto usa datos mock en memoria (interactivos)
// para poder ver y navegar la app sin backend. Con VITE_DATA_SOURCE=supabase se
// conmutaría al backend real (RLS ya verificada). El wiring completo a Supabase
// de cada endpoint queda como paso posterior — ver todo.md.

import type {
  Profile, Incident, IncidentComment, IncidentStatus, IncidentCategory,
  Encuesta, ZonaComun, Reserva, Anuncio, AnuncioNivel, Contact, AccessRequest,
  ParkingCesion, CesionTipo, ParkingQuincena,
} from '@/types'
import * as mock from '@/mock/data'
import { PISOS, proximasQuincenas, proximosTurnos } from '@/lib/parking'
import { iniciales } from '@/lib/format'

const delay = <T>(v: T, ms = 180): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms))
const uid = (() => { let n = 1000; return () => `gen_${n++}` })()

// ---- Estado en memoria (semilla desde mock; mutable para demo) ---------------
const db = {
  incidencias: structuredClone(mock.MOCK_INCIDENTS) as Incident[],
  encuestas: structuredClone(mock.MOCK_ENCUESTAS) as Encuesta[],
  zonas: structuredClone(mock.MOCK_ZONAS) as ZonaComun[],
  reservas: structuredClone(mock.MOCK_RESERVAS) as Reserva[],
  reservasGestion: structuredClone(mock.MOCK_RESERVAS_PENDIENTES_GESTION) as Reserva[],
  anuncios: structuredClone(mock.MOCK_ANUNCIOS) as Anuncio[],
  anunciosPendientes: structuredClone(mock.MOCK_ANUNCIOS_PENDIENTES) as Anuncio[],
  contactos: structuredClone(mock.MOCK_CONTACTS) as Contact[],
  requests: structuredClone(mock.MOCK_ACCESS_REQUESTS) as AccessRequest[],
  cesiones: [] as ParkingCesion[],
}

// ---- Sesión (mock user; el rol se puede cambiar en dev para probar vistas) ---
let currentUser: Profile = structuredClone(mock.MOCK_USER)
export function getUser(): Profile { return currentUser }
export function setUserRole(rol: Profile['rol']) { currentUser = { ...currentUser, rol } }

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
    eventos: [{ id: uid(), estado_anterior: null, estado_nuevo: 'abierta', actor_nombre: currentUser.nombre, created_at: new Date().toISOString() }],
    created_at: new Date().toISOString(),
  }
  db.incidencias.unshift(inc)
  return delay(inc)
}

export function comentarIncidencia(id: string, texto: string): Promise<IncidentComment> {
  const inc = db.incidencias.find((i) => i.id === id)!
  const c: IncidentComment = {
    id: uid(), autor_id: currentUser.id, autor_nombre: currentUser.nombre, autor_rol: currentUser.rol,
    texto, oculto: false, created_at: new Date().toISOString(),
  }
  inc.comentarios.push(c)
  return delay(c)
}

export function cambiarEstadoIncidencia(id: string, estado: IncidentStatus): Promise<Incident> {
  const inc = db.incidencias.find((i) => i.id === id)!
  inc.eventos.push({ id: uid(), estado_anterior: inc.estado, estado_nuevo: estado, actor_nombre: currentUser.nombre, created_at: new Date().toISOString() })
  inc.estado = estado
  return delay(inc)
}

// ---- Encuestas ---------------------------------------------------------------
export const listEncuestas = () => delay(db.encuestas.slice())
export const getEncuesta = (id: string) => delay(db.encuestas.find((e) => e.id === id) ?? null)

export function votar(encuestaId: string, opcionIds: string[]): Promise<Encuesta> {
  const e = db.encuestas.find((x) => x.id === encuestaId)!
  const antes = e.mi_voto_opcion_ids
  // recuenta: quita voto anterior, añade nuevo
  antes.forEach((oid) => { const o = e.opciones.find((o) => o.id === oid); if (o) o.votos-- })
  if (antes.length === 0) e.viviendas_votantes++
  opcionIds.forEach((oid) => { const o = e.opciones.find((o) => o.id === oid); if (o) o.votos++ })
  if (opcionIds.length === 0 && antes.length > 0) e.viviendas_votantes--
  e.mi_voto_opcion_ids = opcionIds
  return delay(e)
}

// ---- Zonas y reservas --------------------------------------------------------
export const listZonas = () => delay(db.zonas.filter((z) => z.activa))
export const misReservas = () => delay(db.reservas.filter((r) => r.solicitada_por === currentUser.id))

/** Reserva vigente de la vivienda (pendiente/aprobada y no pasada), o null. */
export function reservaVigente(): Promise<Reserva | null> {
  const now = Date.now()
  const r = db.reservas.find((r) => r.vivienda === currentUser.vivienda
    && (r.estado === 'pendiente' || r.estado === 'aprobada') && new Date(r.fin).getTime() >= now)
  return delay(r ?? null)
}

export function ocupacionZonaDia(zonaId: string, fechaISO: string): Promise<{ inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }[]> {
  const dia = fechaISO.slice(0, 10)
  const franjas = [...db.reservas, ...db.reservasGestion]
    .filter((r) => r.zona_id === zonaId && (r.estado === 'pendiente' || r.estado === 'aprobada') && r.inicio.slice(0, 10) === dia)
    .map((r) => ({ inicio: r.inicio, fin: r.fin, estado: r.estado as 'pendiente' | 'aprobada' }))
  return delay(franjas)
}

export function crearReserva(input: { zonaId: string; inicio: string; fin: string; numInvitados: number }): Promise<Reserva> {
  const zona = db.zonas.find((z) => z.id === input.zonaId)!
  const r: Reserva = {
    id: uid(), zona_id: input.zonaId, zona_nombre: zona.nombre, vivienda: currentUser.vivienda,
    solicitada_por: currentUser.id, inicio: input.inicio, fin: input.fin, num_invitados: input.numInvitados,
    estado: 'pendiente', created_at: new Date().toISOString(),
  }
  db.reservas.push(r)
  return delay(r)
}

export function cancelarReserva(id: string): Promise<void> {
  const r = db.reservas.find((r) => r.id === id)
  if (r) r.estado = 'cancelada'
  return delay(undefined)
}

// Gestión de reservas
export const reservasPendientesGestion = () => delay(db.reservasGestion.filter((r) => r.estado === 'pendiente'))
export function resolverReserva(id: string, aprobar: boolean, motivo?: string): Promise<void> {
  const r = db.reservasGestion.find((r) => r.id === id)
  if (r) { r.estado = aprobar ? 'aprobada' : 'rechazada'; r.motivo_rechazo = motivo }
  return delay(undefined)
}

// ---- Parking -----------------------------------------------------------------
export function parkingProximas(n = 5): Promise<ParkingQuincena[]> { return delay(proximasQuincenas(n)) }
export function parkingMisTurnos(): Promise<ReturnType<typeof proximosTurnos>> {
  return delay(proximosTurnos(currentUser.vivienda))
}
export const listCesiones = () => delay(db.cesiones.slice())
export function crearCesion(input: { tipo: CesionTipo; desde: string; hasta: string; nota?: string }): Promise<ParkingCesion> {
  const c: ParkingCesion = {
    id: uid(), vivienda: currentUser.vivienda, tipo: input.tipo, desde: input.desde, hasta: input.hasta,
    nota: input.nota, estado: 'activa', created_at: new Date().toISOString(),
  }
  db.cesiones.push(c)
  return delay(c)
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
export const misAnuncios = () => delay([...db.anuncios, ...db.anunciosPendientes].filter((a) => a.autor_id === currentUser.id))

export function crearAnuncio(input: {
  titulo: string; cuerpo: string; fechaInicio: string; fechaFin: string; nivelSolicitado: AnuncioNivel
}): Promise<Anuncio> {
  const a: Anuncio = {
    id: uid(), autor_id: currentUser.id, autor_nombre: currentUser.nombre, vivienda: currentUser.vivienda,
    titulo: input.titulo, cuerpo: input.cuerpo, fecha_inicio: input.fechaInicio, fecha_fin: input.fechaFin,
    revision_larga: false, nivel_solicitado: input.nivelSolicitado, nivel: null, estado: 'pendiente',
    created_at: new Date().toISOString(),
  }
  db.anunciosPendientes.push(a)
  return delay(a)
}

export const anunciosPendientesGestion = () => delay(db.anunciosPendientes.filter((a) => a.estado === 'pendiente'))
export function resolverAnuncio(id: string, accion: 'publicar' | 'rechazar', nivel?: AnuncioNivel, motivo?: string): Promise<void> {
  const idx = db.anunciosPendientes.findIndex((a) => a.id === id)
  if (idx < 0) return delay(undefined)
  const a = db.anunciosPendientes[idx]
  if (accion === 'publicar') {
    a.estado = 'publicado'; a.nivel = nivel ?? a.nivel_solicitado; a.publicado_at = new Date().toISOString()
    db.anuncios.unshift(a); db.anunciosPendientes.splice(idx, 1)
  } else {
    a.estado = 'rechazado'; a.motivo_rechazo = motivo; db.anunciosPendientes.splice(idx, 1)
  }
  return delay(undefined)
}

// ---- Contactos ---------------------------------------------------------------
export const listContactos = () => delay(db.contactos.slice().sort((a, b) => a.orden - b.orden))

// ---- Solicitudes de acceso ---------------------------------------------------
export const listAccessRequests = () => delay(db.requests.filter((r) => r.estado === 'pendiente'))
export function resolverSolicitud(id: string, aprobar: boolean): Promise<void> {
  const r = db.requests.find((r) => r.id === id)
  if (r) r.estado = aprobar ? 'aprobada' : 'rechazada'
  return delay(undefined)
}
export function crearSolicitud(input: { nombre: string; email: string; vivienda: string; comentario?: string }): Promise<void> {
  db.requests.push({ id: uid(), ...input, estado: 'pendiente', created_at: new Date().toISOString() })
  return delay(undefined)
}

export { iniciales }
