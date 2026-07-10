// Switch de la capa de datos: enruta a la implementación mock (demo, en memoria)
// o a la real (Supabase) según VITE_DATA_SOURCE. Los componentes importan siempre
// de '@/lib/api'; no cambian según el modo.
import { usingSupabase } from '@/lib/supabase'
import * as mock from './apiMock'
import * as sup from './apiSupabase'

export type { ContactCategory, Aviso } from './apiMock'

const A: typeof mock = usingSupabase ? (sup as unknown as typeof mock) : mock

export const {
  getUser, setUserRole, actualizarNombre, iniciales,
  listViviendas,
  listEncuestas, getEncuesta, votarPregunta, crearEncuesta, cerrarEncuesta, borrarEncuesta,
  listZonas, misReservas, reservaVigente, ocupacionZonaDia, ocupacionDia, crearReserva, cancelarReserva,
  reservasPendientesGestion, reservasGestion, resolverReserva,
  parkingProximas, parkingMisTurnos, listCesiones, misCesiones, cesionesActivas,
  crearCesion, cancelarCesion, reasignarCesion, demandaParking,
  listContactos, crearContacto, editarContacto, borrarContacto,
  listAccessRequests, resolverSolicitud, crearSolicitud,
  listVecinos, suspenderVecino, cambiarRolVecino, editarVecino, darDeBajaVecino,
  listRolePermisos, setRolePermiso, enviarSugerencia,
  guardarSuscripcionPush, quitarSuscripcionPush,
  listMensajes, crearMensaje, editarMensaje, borrarMensaje,
  listHilos, getHilo, crearHilo, responderHilo, cerrarHilo, borrarHilo, convertirEnMensaje,
  listAvisos,
} = A
