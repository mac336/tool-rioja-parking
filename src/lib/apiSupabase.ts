// Implementación REAL de la capa de datos contra Supabase (supabase-js + RLS).
// Patrón: `export *` del mock como base (fallback) y re-exports EXPLÍCITOS por
// dominio que lo sobreescriben (un named export gana al export * del mismo nombre).
// Así se cablea de forma incremental sin romper el build.
export * from './apiMock'

// Overrides reales por dominio (se añaden conforme se implementan en src/lib/db/*):
export {
  listIncidencias, getIncidencia, crearIncidencia, editarIncidencia, borrarIncidencia,
  comentarIncidencia, ocultarComentario, bloquearComentarios, cambiarEstadoIncidencia,
  incidenciasPendientesGestion, aprobarIncidencia,
} from './db/incidencias'
export {
  listEncuestas, getEncuesta, votarPregunta, crearEncuesta, cerrarEncuesta, borrarEncuesta,
} from './db/encuestas'
export {
  listZonas, misReservas, reservaVigente, ocupacionZonaDia, ocupacionDia, crearReserva, cancelarReserva,
  reservasPendientesGestion, resolverReserva,
} from './db/reservas'
export {
  parkingMisTurnos, listCesiones, misCesiones, cesionesActivas,
  crearCesion, cancelarCesion, reasignarCesion, demandaParking,
} from './db/parking'
export {
  anunciosPrincipales, anunciosListado, misAnuncios, viviendaPuedePublicar,
  crearAnuncio, editarAnuncio, borrarAnuncio, anunciosPendientesGestion, resolverAnuncio,
  moverNivelAnuncio, despublicarAnuncio, reportarAnuncio, listReportes, descartarReporte,
  listViviendasBloqueadas, bloquearVivienda,
} from './db/anuncios'
export {
  listContactos, crearContacto, editarContacto, borrarContacto,
} from './db/contactos'
export {
  listAccessRequests, resolverSolicitud, crearSolicitud, listVecinos, suspenderVecino, cambiarRolVecino,
  editarVecino, darDeBajaVecino, listAvisos,
} from './db/admin'
export { listRolePermisos, setRolePermiso } from './db/permisos'
export { actualizarNombre } from './db/perfil'
export { subirAdjuntosIncidencia, urlFirmada } from './db/storage'
