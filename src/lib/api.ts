// Switch de la capa de datos: enruta a la implementación mock (demo, en memoria)
// o a la real (Supabase) según VITE_DATA_SOURCE. Los componentes importan siempre
// de '@/lib/api'; no cambian según el modo.
import { usingSupabase } from '@/lib/supabase'
import * as mock from './apiMock'
import * as sup from './apiSupabase'

export type { Aviso } from './apiMock'

const A: typeof mock = usingSupabase ? (sup as unknown as typeof mock) : mock

export const {
  getUser, setUserRole, actualizarNombre, iniciales,
  listViviendas,
  listEncuestas, getEncuesta, votarPregunta, crearEncuesta, cerrarEncuesta, borrarEncuesta,
  crearEncuestaJunta, getJuntaParticipacion, setJuntaParticipacion, juntaResultados, juntaDetalleReal, juntaParticipantes,
  listZonas, misReservas, reservaVigente, ocupacionDia, crearReserva, cancelarReserva,
  reservasGestion, reservasPendientesGestion, resolverReserva, estadisticasReservas,
  parkingProximas, parkingMisTurnos, misCesiones, cesionesActivas,
  crearCesion, cancelarCesion, reasignarCesion, demandaParking,
  listContactos, crearContacto, editarContacto, borrarContacto,
  listAccessRequests, resolverSolicitud, crearSolicitud,
  listVecinos, suspenderVecino, cambiarRolVecino, editarVecino, darDeBajaVecino, eliminarVecinoDefinitivo, crearVecinoDirecto, statsAcceso, statsAccesoPorVivienda, viviendasInquilino, contarSolicitudesPendientes, registrarPwa, registrarVersion, avisarActualizacion,
  listRolePermisos, setRolePermiso, listSugerencias,
  guardarSuscripcionPush, quitarSuscripcionPush, probarPush,
  listMensajes, crearMensaje, editarMensaje, borrarMensaje, crearPublicacion, misPublicaciones, publicacionesGestion, moderarPublicacion, alternarLike,
  listHilos, getHilo, crearHilo, crearHiloComoGestion, listDirectorio, responderHilo, cerrarHilo, borrarHilo, convertirEnMensaje,
  listAvisos,
  getComunidadDatos,
  getConfig, setConfig,
} = A
