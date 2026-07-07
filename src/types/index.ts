// Modelos de dominio de Rioja 25 — alineados con specs/04-modelo-de-datos.md.
// Los 6 roles del contrato; en UI se agrupan en 3 estilos de badge (ver roleBadge()).

export type Role =
  | 'app_admin'
  | 'presidente'
  | 'vicepresidente'
  | 'administrador_finca'
  | 'junta'
  | 'vecino'

export type UserStatus = 'pendiente' | 'activo' | 'suspendido'

/** Agrupación visual de los 6 roles en 3 badges (design handoff: vecino/junta/admin). */
export type RoleBadgeKind = 'vecino' | 'junta' | 'admin'

export interface Profile {
  id: string
  email: string
  nombre: string
  vivienda: string // FK viviendas.codigo, ej. "2º C Dcha"
  rol: Role
  estado: UserStatus
  normas_aceptadas_at: string | null
  iniciales: string
}

export interface Vivienda {
  codigo: string
  orden: number
  puede_publicar_anuncios: boolean
}

export interface AccessRequest {
  id: string
  nombre: string
  email: string
  vivienda: string
  comentario?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  motivo_rechazo?: string
  created_at: string
}

export type IncidentStatus = 'abierta' | 'en_curso' | 'resuelta' | 'cerrada'
export type IncidentCategory =
  | 'limpieza' | 'ascensor' | 'garaje' | 'jardin' | 'piscina' | 'ruido' | 'otros'
export type IncidentPriority = 'baja' | 'media' | 'alta'

export interface IncidentComment {
  id: string
  autor_id: string
  autor_nombre: string
  autor_rol: Role
  texto: string
  oculto: boolean
  created_at: string
}

export interface IncidentEvent {
  id: string
  estado_anterior: IncidentStatus | null
  estado_nuevo: IncidentStatus
  actor_nombre: string
  created_at: string
}

export interface Incident {
  id: string
  autor_id: string
  autor_nombre: string
  autor_vivienda: string
  titulo: string
  descripcion: string
  categoria: IncidentCategory
  ubicacion?: string
  estado: IncidentStatus
  prioridad?: IncidentPriority
  comentarios_bloqueados: boolean
  fotos: string[]
  comentarios: IncidentComment[]
  eventos: IncidentEvent[]
  created_at: string
}

export type EncuestaTipo = 'opcion_unica' | 'opcion_multiple'
export type EncuestaEstado = 'programada' | 'abierta' | 'cerrada'

/** Formato de la encuesta: una sola pregunta (votación simple) o varias. */
export type EncuestaFormato = 'unica' | 'multi'

export interface EncuestaOpcion {
  id: string
  texto: string
  votos: number
}

export interface EncuestaPregunta {
  id: string
  texto: string
  tipo: EncuestaTipo // opción única o múltiple, por pregunta
  opciones: EncuestaOpcion[] // 2 a 5
  mi_voto_opcion_ids: string[] // opciones marcadas por la vivienda del usuario en ESTA pregunta
}

export interface Encuesta {
  id: string
  titulo: string
  descripcion?: string
  formato: EncuestaFormato
  apertura: string
  cierre: string
  estado: EncuestaEstado
  creada_por_nombre: string
  total_viviendas: number
  viviendas_votantes: number // nº de viviendas que han participado (votado ≥1 pregunta)
  preguntas: EncuestaPregunta[] // 1 si formato='unica'; varias si 'multi'
}

export type ReservaEstado = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'

export interface ZonaComun {
  id: string
  nombre: string
  descripcion?: string
  reglas?: string
  activa: boolean
  franja_min?: string // "09:00"
  franja_max?: string // "22:00"
  duracion_max_min?: number
  requiere_invitados: boolean
}

export interface Reserva {
  id: string
  zona_id: string
  zona_nombre: string
  vivienda: string
  solicitada_por: string
  inicio: string // ISO
  fin: string // ISO
  num_invitados: number
  estado: ReservaEstado
  aprobada_por?: string
  motivo_rechazo?: string
  created_at: string
}

/** Vista de ocupación sin identidad (para vecinos): solo franja + estado. */
export interface OcupacionFranja {
  zona_id: string
  inicio: string
  fin: string
  estado: 'pendiente' | 'aprobada'
}

export type CesionTipo = 'cede' | 'no_necesita' | 'necesita'
export type CesionEstado = 'activa' | 'reasignada' | 'cancelada'

export interface ParkingCesion {
  id: string
  vivienda: string
  tipo: CesionTipo
  desde: string // date
  hasta: string // date
  nota?: string
  estado: CesionEstado
  reasignada_a?: string
  gestionada_por?: string
  created_at: string
}

/** Una plaza de la quincena (resultado del cálculo de rotación). */
export interface ParkingPlaza {
  numero: number // 1..6
  vivienda: string | null // null = LIBRE
}

export interface ParkingQuincena {
  indice: number // quincena global
  inicio: string // ISO date
  fin: string // ISO date
  plazas: ParkingPlaza[]
  actual: boolean
}

export type AnuncioNivel = 'principal' | 'secundario'
export type AnuncioEstado = 'pendiente' | 'publicado' | 'rechazado' | 'archivado'

export interface Anuncio {
  id: string
  autor_id: string
  autor_nombre: string
  vivienda: string
  titulo: string
  cuerpo: string // markdown restringido, saneado
  imagen_path?: string
  fecha_inicio: string // date
  fecha_fin: string // date
  revision_larga: boolean
  nivel_solicitado: AnuncioNivel
  nivel: AnuncioNivel | null
  estado: AnuncioEstado
  aprobado_por?: string
  motivo_rechazo?: string
  publicado_at?: string
  created_at: string
}

export type ContactCategory = 'administrador' | 'conserje' | 'proveedor' | 'junta' | 'seguro'
export interface Contact {
  id: string
  funcion: string
  nombre: string
  categoria: ContactCategory
  direccion?: string
  telefonos: string[]
  web_o_email?: string
  orden: number
}

export type ReporteEntidad = 'anuncio' | 'comentario'
export interface Reporte {
  id: string
  entidad: ReporteEntidad
  entidad_id: string
  autor_id: string
  motivo: string
  estado: 'pendiente' | 'atendido' | 'descartado'
  created_at: string
}

// Estado de UI transversal
export type LoadState = 'idle' | 'loading' | 'empty' | 'error' | 'ready'
export type ThemeMode = 'light' | 'dark' | 'system'

/** Sesión del usuario actual (auth + profile). */
export interface Session {
  profile: Profile | null
  authenticated: boolean
}
