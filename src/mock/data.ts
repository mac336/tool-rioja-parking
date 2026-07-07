// Datos de ejemplo en español para poblar la UI sin backend (VITE_DATA_SOURCE=mock).
// Alineados con src/types y con las viviendas reales de la comunidad.

import type {
  Profile, Incident, Encuesta, ZonaComun, Reserva, Anuncio, Contact, AccessRequest,
} from '@/types'
import { quincenaGlobal } from '@/lib/parking'

export const MOCK_USER: Profile = {
  id: 'u_marta',
  email: 'marta.ruiz@correo.es',
  nombre: 'Marta Ruiz Bel',
  vivienda: '2º C Dcha',
  rol: 'vecino',
  estado: 'activo',
  normas_aceptadas_at: '2026-03-01T10:00:00Z',
  iniciales: 'MR',
}

export const MOCK_ACCESS_REQUESTS: AccessRequest[] = [
  { id: 'r1', nombre: 'Jorge Lama', email: 'jorge.lama@correo.es', vivienda: '1º A Dcha',
    comentario: 'Soy propietario desde marzo.', estado: 'pendiente', created_at: '2026-07-06T06:20:00Z' },
  { id: 'r2', nombre: 'Clara Nogal', email: 'clara.nogal@correo.es', vivienda: '3º B Izqda',
    estado: 'pendiente', created_at: '2026-07-05T18:00:00Z' },
  { id: 'r3', nombre: 'Luis Pardo', email: 'luis.pardo@correo.es', vivienda: 'Bajo C',
    comentario: 'Nuevo inquilino.', estado: 'pendiente', created_at: '2026-07-04T09:00:00Z' },
]

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: '128', autor_id: 'u_x', autor_nombre: 'Ana (3º B Dcha)', autor_vivienda: '3º B Dcha',
    titulo: 'Luz fundida en el portal', descripcion: 'La bombilla de la entrada lleva dos días sin funcionar. Por la noche se ve muy poco al entrar.',
    categoria: 'otros', ubicacion: 'Portal', estado: 'abierta', prioridad: 'media',
    comentarios_bloqueados: false, fotos: [],
    comentarios: [
      { id: 'c1', autor_id: 'u_j', autor_nombre: 'David Seco', autor_rol: 'presidente',
        texto: 'Avisamos al electricista para mañana.', oculto: false, created_at: '2026-07-06T09:10:00Z' },
    ],
    eventos: [
      { id: 'e1', estado_anterior: null, estado_nuevo: 'abierta', actor_nombre: 'Ana', created_at: '2026-07-06T08:20:00Z' },
    ],
    created_at: '2026-07-06T08:20:00Z',
  },
  {
    id: '127', autor_id: 'u_y', autor_nombre: 'Pedro (1º C Izqda)', autor_vivienda: '1º C Izqda',
    titulo: 'Ruido en el ascensor', descripcion: 'Hace un ruido metálico al frenar en la planta baja.',
    categoria: 'ascensor', ubicacion: 'Ascensor', estado: 'en_curso', prioridad: 'alta',
    comentarios_bloqueados: false, fotos: [], comentarios: [],
    eventos: [
      { id: 'e2', estado_anterior: null, estado_nuevo: 'abierta', actor_nombre: 'Pedro', created_at: '2026-07-05T10:00:00Z' },
      { id: 'e3', estado_anterior: 'abierta', estado_nuevo: 'en_curso', actor_nombre: 'David Seco', created_at: '2026-07-05T18:00:00Z' },
    ],
    created_at: '2026-07-05T10:00:00Z',
  },
  {
    id: '126', autor_id: 'u_z', autor_nombre: 'Bajo A', autor_vivienda: 'Bajo A',
    titulo: 'Gotera en el garaje', descripcion: 'Filtración junto a la rampa cuando llueve.',
    categoria: 'garaje', ubicacion: 'Garaje', estado: 'resuelta',
    comentarios_bloqueados: false, fotos: [], comentarios: [], eventos: [],
    created_at: '2026-07-03T12:00:00Z',
  },
]

const cierraEn = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString()

export const MOCK_ENCUESTAS: Encuesta[] = [
  // Votación simple (una pregunta)
  {
    id: 'p1', titulo: 'Nuevo horario de la piscina en verano', descripcion: 'Elige el horario que prefieres.',
    formato: 'unica', apertura: '2026-07-01T00:00:00Z', cierre: cierraEn(4), estado: 'abierta',
    creada_por_nombre: 'Junta', total_viviendas: 41, viviendas_votantes: 23,
    preguntas: [
      {
        id: 'q1', texto: 'Nuevo horario de la piscina en verano', tipo: 'opcion_unica',
        mi_voto_opcion_ids: ['o2'],
        opciones: [
          { id: 'o1', texto: '10:00 – 20:00', votos: 7 },
          { id: 'o2', texto: '11:00 – 21:00', votos: 13 },
          { id: 'o3', texto: 'Con cierre 14–17 h', votos: 3 },
        ],
      },
    ],
  },
  // Encuesta multi-pregunta
  {
    id: 'p2', titulo: 'Mejoras para la comunidad 2026', descripcion: 'Vota cada propuesta.',
    formato: 'multi', apertura: '2026-07-01T00:00:00Z', cierre: cierraEn(12), estado: 'abierta',
    creada_por_nombre: 'Junta', total_viviendas: 41, viviendas_votantes: 31,
    preguntas: [
      {
        id: 'q1', texto: 'Instalar punto de recarga para coche eléctrico', tipo: 'opcion_unica',
        mi_voto_opcion_ids: [],
        opciones: [{ id: 'a', texto: 'Sí', votos: 24 }, { id: 'b', texto: 'No', votos: 7 }],
      },
      {
        id: 'q2', texto: '¿Qué zona común mejoramos primero?', tipo: 'opcion_unica',
        mi_voto_opcion_ids: [],
        opciones: [
          { id: 'c', texto: 'Jardín', votos: 12 },
          { id: 'd', texto: 'Piscina', votos: 9 },
          { id: 'e', texto: 'Sala comunidad', votos: 6 },
        ],
      },
      {
        id: 'q3', texto: 'Días para la fiesta de vecinos', tipo: 'opcion_multiple',
        mi_voto_opcion_ids: [],
        opciones: [
          { id: 'f', texto: 'Viernes', votos: 10 },
          { id: 'g', texto: 'Sábado', votos: 18 },
          { id: 'h', texto: 'Domingo', votos: 5 },
        ],
      },
    ],
  },
  // Cerrada
  {
    id: 'p3', titulo: 'Cambio de empresa de limpieza', formato: 'unica',
    apertura: '2026-06-01T00:00:00Z', cierre: '2026-06-30T23:59:00Z', estado: 'cerrada',
    creada_por_nombre: 'Junta', total_viviendas: 41, viviendas_votantes: 38,
    preguntas: [
      {
        id: 'q1', texto: 'Cambio de empresa de limpieza', tipo: 'opcion_unica', mi_voto_opcion_ids: ['si'],
        opciones: [{ id: 'si', texto: 'Sí', votos: 30 }, { id: 'no', texto: 'No', votos: 8 }],
      },
    ],
  },
]

export const MOCK_ZONAS: ZonaComun[] = [
  { id: 'z1', nombre: 'Jardín', descripcion: 'Zona ajardinada común', activa: true, franja_min: '09:00', franja_max: '22:00', requiere_invitados: true },
  { id: 'z2', nombre: 'Piscina', descripcion: 'Piscina de la comunidad', activa: true, franja_min: '10:00', franja_max: '21:00', requiere_invitados: true },
  { id: 'z3', nombre: 'Sala comunidad', descripcion: 'Sala social', activa: true, franja_min: '09:00', franja_max: '23:00', requiere_invitados: true },
  { id: 'z4', nombre: 'Lonja Delantera', descripcion: 'Lonja delantera', activa: true, franja_min: '09:00', franja_max: '23:00', requiere_invitados: true },
]

const diaISO = (dias: number, hora: number) => {
  const d = new Date(Date.now() + dias * 86_400_000)
  d.setHours(hora, 0, 0, 0)
  return d.toISOString()
}

// Una sola lista de reservas (de todas las viviendas). La cola del presidente
// filtra las pendientes; "Mis reservas" filtra por la vivienda del usuario.
export const MOCK_RESERVAS: Reserva[] = [
  {
    id: 'rv1', zona_id: 'z3', zona_nombre: 'Sala comunidad', vivienda: '2º C Dcha', solicitada_por: 'u_marta',
    inicio: diaISO(5, 16), fin: diaISO(5, 19), num_invitados: 8, estado: 'aprobada', created_at: '2026-07-05T00:00:00Z',
  },
  {
    id: 'rv9', zona_id: 'z2', zona_nombre: 'Piscina', vivienda: '1º D Dcha', solicitada_por: 'u_o',
    inicio: diaISO(8, 12), fin: diaISO(8, 15), num_invitados: 10, estado: 'pendiente', created_at: '2026-07-06T00:00:00Z',
  },
]

export const MOCK_ANUNCIOS: Anuncio[] = [
  {
    id: 'a1', autor_id: 'u_j', autor_nombre: 'Junta', vivienda: '1º A Dcha',
    titulo: 'Cena de vecinos en el patio', cuerpo: 'El **sábado 19** a las 21:00 hacemos una cena en el patio. ¡Trae algo para compartir!',
    fecha_inicio: '2026-07-07', fecha_fin: '2026-07-20', revision_larga: false,
    nivel_solicitado: 'principal', nivel: 'principal', estado: 'publicado', publicado_at: '2026-07-06T10:00:00Z', created_at: '2026-07-06T09:00:00Z',
  },
  {
    id: 'a2', autor_id: 'u_marta', autor_nombre: 'Marta Ruiz Bel', vivienda: '2º C Dcha',
    titulo: 'Vendo bicicleta de paseo', cuerpo: 'Bici de paseo en buen estado, 60 €. Interesados escribid al portal.',
    fecha_inicio: '2026-07-05', fecha_fin: '2026-08-05', revision_larga: false,
    nivel_solicitado: 'secundario', nivel: 'secundario', estado: 'publicado', publicado_at: '2026-07-05T12:00:00Z', created_at: '2026-07-05T11:00:00Z',
  },
  {
    id: 'a3', autor_id: 'u_p', autor_nombre: 'David Seco', vivienda: '1º F Dcha',
    titulo: 'Corte de agua programado', cuerpo: 'El martes de 10:00 a 12:00 habrá corte de agua por mantenimiento.',
    fecha_inicio: '2026-07-08', fecha_fin: '2026-07-09', revision_larga: false,
    nivel_solicitado: 'principal', nivel: 'principal', estado: 'publicado', publicado_at: '2026-07-06T08:00:00Z', created_at: '2026-07-06T07:00:00Z',
  },
]

// Anuncio pendiente de moderar (va en la misma lista MOCK_ANUNCIOS al sembrar).
export const MOCK_ANUNCIOS_PENDIENTES: Anuncio[] = [
  {
    id: 'a9', autor_id: 'u_q', autor_nombre: 'Sara (2º E Izqda)', vivienda: '2º E Izqda',
    titulo: 'Clases de guitarra para vecinos', cuerpo: 'Ofrezco clases de guitarra los fines de semana.',
    fecha_inicio: '2026-07-10', fecha_fin: '2026-09-10', revision_larga: false,
    nivel_solicitado: 'principal', nivel: null, estado: 'pendiente', created_at: '2026-07-06T15:00:00Z',
  },
]

// Vecinos de la comunidad (para la gestión de usuarios del panel admin).
export const MOCK_VECINOS: Profile[] = [
  MOCK_USER,
  { id: 'u_o', email: 'ana.lopez@correo.es', nombre: 'Ana López', vivienda: '1º D Dcha', rol: 'vecino', estado: 'activo', normas_aceptadas_at: '2026-02-01T00:00:00Z', iniciales: 'AL' },
  { id: 'u_p', email: 'david.seco@correo.es', nombre: 'David Seco', vivienda: '1º F Dcha', rol: 'presidente', estado: 'activo', normas_aceptadas_at: '2026-01-10T00:00:00Z', iniciales: 'DS' },
  { id: 'u_q', email: 'sara.gil@correo.es', nombre: 'Sara Gil', vivienda: '2º E Izqda', rol: 'vecino', estado: 'activo', normas_aceptadas_at: '2026-03-15T00:00:00Z', iniciales: 'SG' },
  { id: 'u_r', email: 'luis.mora@correo.es', nombre: 'Luis Mora', vivienda: '3º B Dcha', rol: 'junta', estado: 'activo', normas_aceptadas_at: '2026-02-20T00:00:00Z', iniciales: 'LM' },
  { id: 'u_s', email: 'carmen.ruiz@correo.es', nombre: 'Carmen Ruiz', vivienda: 'Bajo A', rol: 'vecino', estado: 'suspendido', normas_aceptadas_at: '2026-01-05T00:00:00Z', iniciales: 'CR' },
]

export const MOCK_CONTACTS: Contact[] = [
  { id: 'ct1', funcion: 'Administrador', nombre: 'Antonio Ortega Martín', categoria: 'administrador',
    direccion: 'C/ Rodríguez San Pedro nº 2, 2º, Oficina 302 · 28015 Madrid',
    telefonos: ['91 594 39 33', '91 808 59 88'], web_o_email: 'info@fincasortegadelgado.com', orden: 1 },
  { id: 'ct2', funcion: 'Conserje', nombre: 'Iván Rivera Carballada', categoria: 'conserje',
    telefonos: ['647 26 76 48'], orden: 2 },
  { id: 'ct3', funcion: 'Presidente', nombre: 'David Seco', categoria: 'junta', direccion: '1D esc. dcha.',
    telefonos: [], orden: 3 },
  { id: 'ct4', funcion: 'Ascensores', nombre: 'ThyssenKrupp Elevadores', categoria: 'proveedor',
    direccion: 'C/ Villaescusa nº 2', telefonos: ['91 327 45 46'], orden: 10 },
  { id: 'ct5', funcion: 'Seguro', nombre: 'OCASO', categoria: 'seguro', direccion: 'Nº Póliza: 220960',
    telefonos: ['91 703 90 10'], orden: 5 },
]

/** Quincena actual para el mock de parking (usa la matemática real). */
export const MOCK_QUINCENA_ACTUAL = quincenaGlobal()
