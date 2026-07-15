// Implementación REAL de la capa de datos contra Supabase (supabase-js + RLS).
// Patrón: `export *` del mock como base (fallback) y re-exports EXPLÍCITOS por
// dominio que lo sobreescriben (un named export gana al export * del mismo nombre).
// Así se cablea de forma incremental sin romper el build.
export * from './apiMock'

// Overrides reales por dominio:
export {
  listEncuestas, getEncuesta, votarPregunta, crearEncuesta, cerrarEncuesta, borrarEncuesta,
} from './db/encuestas'
export {
  listZonas, misReservas, reservaVigente, ocupacionDia, crearReserva, cancelarReserva,
  reservasGestion, estadisticasReservas,
} from './db/reservas'
export {
  parkingMisTurnos, misCesiones, cesionesActivas,
  crearCesion, cancelarCesion, reasignarCesion, demandaParking,
} from './db/parking'
export {
  listContactos, crearContacto, editarContacto, borrarContacto,
} from './db/contactos'
export {
  listAccessRequests, resolverSolicitud, crearSolicitud, listVecinos, suspenderVecino, cambiarRolVecino,
  editarVecino, darDeBajaVecino, eliminarVecinoDefinitivo, crearVecinoDirecto, statsAcceso, statsAccesoPorVivienda, listAvisos,
} from './db/admin'
export { listRolePermisos, setRolePermiso } from './db/permisos'
export { listSugerencias } from './db/sugerencias'
export { guardarSuscripcionPush, quitarSuscripcionPush } from './db/push'
export { listMensajes, crearMensaje, editarMensaje, borrarMensaje, crearPublicacion, misPublicaciones, publicacionesGestion, moderarPublicacion, alternarLike } from './db/mensajes'
export { listHilos, getHilo, crearHilo, crearHiloComoGestion, listDirectorio, responderHilo, cerrarHilo, borrarHilo, convertirEnMensaje } from './db/buzon'
export { actualizarNombre } from './db/perfil'
export { getComunidadDatos } from './db/comunidad'
