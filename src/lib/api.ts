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
  listZonas, misReservas, reservaVigente, ocupacionDia, crearReserva, cancelarReserva,
  reservasPendientesGestion, reservasGestion, estadisticasReservas, resolverReserva,
  parkingProximas, parkingMisTurnos, misCesiones, cesionesActivas,
  crearCesion, cancelarCesion, reasignarCesion, demandaParking,
  listContactos, crearContacto, editarContacto, borrarContacto,
  listAccessRequests, resolverSolicitud, crearSolicitud,
  listVecinos, suspenderVecino, cambiarRolVecino, editarVecino, darDeBajaVecino, crearVecinoDirecto, statsAcceso, statsAccesoPorVivienda,
  listRolePermisos, setRolePermiso, listSugerencias,
  guardarSuscripcionPush, quitarSuscripcionPush,
  listMensajes, crearMensaje, editarMensaje, borrarMensaje, crearPublicacion, misPublicaciones, publicacionesGestion, moderarPublicacion, alternarLike,
  listHilos, getHilo, crearHilo, crearHiloComoGestion, listDirectorio, responderHilo, cerrarHilo, borrarHilo, convertirEnMensaje,
  listAvisos,
} = A
