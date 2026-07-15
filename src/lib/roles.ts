import type { Role, RoleBadgeKind } from '@/types'

// Mapeo de los 6 roles del contrato a los 3 estilos de badge del diseño.
export function roleBadgeKind(rol: Role): RoleBadgeKind {
  switch (rol) {
    case 'app_admin':
    case 'administrador_finca':
      return 'admin'
    case 'presidente':
    case 'vicepresidente':
    case 'junta':
    case 'conserje':
      return 'junta'
    default:
      return 'vecino'
  }
}

export const ROLE_LABEL: Record<Role, string> = {
  app_admin: 'Administrador de la app',
  presidente: 'Presidente',
  vicepresidente: 'Vicepresidente',
  administrador_finca: 'Administrador de finca',
  junta: 'Junta',
  conserje: 'Conserje',
  vecino: 'Vecino',
  tester: 'Tester',
}

export const BADGE_LABEL: Record<RoleBadgeKind, string> = {
  admin: 'Admin',
  junta: 'Junta',
  vecino: 'Vecino',
}

// ---- Permisos personalizables ------------------------------------------------
// La verdad la tiene la BD (tabla role_permissions + RLS). En el cliente cacheamos
// los permisos del USUARIO ACTUAL para adaptar la interfaz; app_admin = SUPERADMIN
// (siempre todo). En modo demo (sin backend) no hay caché → se usan los defaults.
export type Permiso =
  // Tablón — por tipo, ver y publicar/editar por separado
  | 'ver_aviso' | 'ver_anuncio' | 'ver_incidencia' | 'ver_sugerencia'
  | 'publicar_aviso' | 'publicar_anuncio' | 'publicar_incidencia' | 'publicar_sugerencia'
  | 'aprobar_incidencias' | 'aprobar_anuncios'
  // Reservas
  | 'realizar_reservas' | 'reservar_otras_viviendas'
  // Buzón
  | 'usar_buzon' | 'escribir_vecinos'
  // Encuestas
  | 'votar_encuestas'
  // Gestión
  | 'panel' | 'aprobar_altas'

export type TipoMensaje = 'aviso' | 'anuncio' | 'incidencia' | 'sugerencia'

// Catálogo AGRUPADO y ORDENADO. El panel del app_admin lo pinta por secciones.
// Añadir una función nueva = añadir su permiso al grupo que corresponda.
export const GRUPOS_PERMISOS: { grupo: string; permisos: { key: Permiso; label: string; desc: string }[] }[] = [
  { grupo: 'Tablón', permisos: [
    { key: 'ver_aviso', label: 'Ver avisos', desc: 'Ver los avisos en el tablón' },
    { key: 'publicar_aviso', label: 'Publicar avisos', desc: 'Crear y editar avisos para la comunidad' },
    { key: 'ver_incidencia', label: 'Ver incidencias', desc: 'Ver las incidencias en el tablón' },
    { key: 'publicar_incidencia', label: 'Publicar incidencias', desc: 'Crear y editar incidencias' },
    { key: 'ver_anuncio', label: 'Ver anuncios', desc: 'Ver los anuncios en el tablón' },
    { key: 'publicar_anuncio', label: 'Publicar anuncios', desc: 'Crear y editar anuncios' },
    { key: 'ver_sugerencia', label: 'Ver sugerencias', desc: 'Ver las sugerencias en el tablón' },
    { key: 'publicar_sugerencia', label: 'Publicar sugerencias', desc: 'Crear y editar sugerencias' },
    { key: 'aprobar_incidencias', label: 'Aprobar incidencias de vecinos', desc: 'Aprobar o rechazar las incidencias que envían los vecinos' },
    { key: 'aprobar_anuncios', label: 'Aprobar anuncios de vecinos', desc: 'Aprobar o rechazar los anuncios que envían los vecinos' },
  ] },
  { grupo: 'Reservas', permisos: [
    { key: 'realizar_reservas', label: 'Realizar reservas', desc: 'Reservar zonas comunes' },
    { key: 'reservar_otras_viviendas', label: 'Reservar para otras viviendas', desc: 'Al reservar, elegir la vivienda a nombre de la que se hace (p. ej. el conserje)' },
  ] },
  { grupo: 'Buzón', permisos: [
    { key: 'usar_buzon', label: 'Chatear por el buzón', desc: 'Escribir mensajes privados por los canales del buzón' },
    { key: 'escribir_vecinos', label: 'Escribir a los vecinos', desc: 'Iniciar chats del buzón con cualquier vecino (en su canal)' },
  ] },
  { grupo: 'Encuestas', permisos: [
    { key: 'votar_encuestas', label: 'Votar en encuestas', desc: 'Emitir voto y ver el módulo de votaciones' },
  ] },
  { grupo: 'Gestión', permisos: [
    { key: 'panel', label: 'Panel de gestión', desc: 'Acceder al panel y al buzón de administración' },
    { key: 'aprobar_altas', label: 'Aprobar altas y gestionar vecinos', desc: 'Aprobar solicitudes, editar, suspender y dar de baja' },
  ] },
]

// Catálogo plano derivado (compatibilidad con consumidores existentes).
export const CATALOGO_PERMISOS: { key: Permiso; label: string; desc: string }[] = GRUPOS_PERMISOS.flatMap((g) => g.permisos)

// Defaults — respaldo en modo demo o mientras no ha cargado la matriz real.
// (app_admin siempre tiene todo por lógica de SUPERADMIN; no hace falta listarlo.)
const GESTION: Role[] = ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta']
const TODOS: Role[] = ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino', 'tester']
const DEFAULTS: Record<Permiso, Role[]> = {
  // Ver: todos ven avisos e incidencias; anuncios y sugerencias todos MENOS el conserje.
  ver_aviso: TODOS,
  ver_incidencia: TODOS,
  ver_anuncio: TODOS.filter((r) => r !== 'conserje'),
  ver_sugerencia: TODOS.filter((r) => r !== 'conserje'),
  // Publicar: la gestión publica todos los tipos; el conserje solo avisos e incidencias.
  publicar_aviso: [...GESTION, 'conserje'],
  publicar_incidencia: [...GESTION, 'conserje'],
  publicar_anuncio: GESTION,
  publicar_sugerencia: GESTION,
  aprobar_incidencias: GESTION,
  aprobar_anuncios: GESTION,
  realizar_reservas: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino'],
  reservar_otras_viviendas: ['app_admin', 'conserje'],
  usar_buzon: TODOS,
  escribir_vecinos: ['app_admin', 'administrador_finca', 'conserje'],
  votar_encuestas: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino'],
  panel: GESTION,
  aprobar_altas: ['app_admin', 'presidente', 'administrador_finca'],
}

/** Matriz de permisos por defecto (para el modo demo / semilla del mock). */
export function permisosPorDefecto(): { rol: Role; permiso: Permiso }[] {
  const out: { rol: Role; permiso: Permiso }[] = []
  for (const key of Object.keys(DEFAULTS) as Permiso[]) for (const rol of DEFAULTS[key]) out.push({ rol, permiso: key })
  return out
}

// Caché de los permisos del usuario actual (null = usar defaults por rol).
let permisosActuales: Set<string> | null = null
export function setPermisosActuales(p: string[] | null) {
  permisosActuales = p ? new Set(p) : null
}

function tienePermiso(rol: Role, key: Permiso): boolean {
  if (rol === 'app_admin') return true // SUPERADMIN
  if (permisosActuales) return permisosActuales.has(key)
  return DEFAULTS[key].includes(rol)
}

/** Roles con acceso a gestión (panel + moderación). */
export function esGestion(rol: Role): boolean {
  return tienePermiso(rol, 'panel')
}

/** Puede aprobar altas de acceso y gestionar vecinos. */
export function puedeAprobarAltas(rol: Role): boolean {
  return tienePermiso(rol, 'aprobar_altas')
}

const TIPOS_MENSAJE: TipoMensaje[] = ['aviso', 'anuncio', 'incidencia', 'sugerencia']

/** ¿Puede VER en el tablón este tipo de mensaje? */
export function puedeVerTipo(rol: Role, tipo: TipoMensaje): boolean {
  return tienePermiso(rol, `ver_${tipo}` as Permiso)
}

/** ¿Puede PUBLICAR/EDITAR este tipo de mensaje? */
export function puedePublicarTipo(rol: Role, tipo: TipoMensaje): boolean {
  return tienePermiso(rol, `publicar_${tipo}` as Permiso)
}

/** Tipos de mensaje que este rol puede VER en el tablón. */
export function tiposQueVe(rol: Role): TipoMensaje[] {
  return TIPOS_MENSAJE.filter((t) => puedeVerTipo(rol, t))
}

/** Tipos de mensaje que este rol puede publicar (para el formulario de alta). */
export function tiposQuePublica(rol: Role): TipoMensaje[] {
  return TIPOS_MENSAJE.filter((t) => puedePublicarTipo(rol, t))
}

/** ¿Puede publicar/editar algún tipo de mensaje? (para mostrar accesos). */
export function puedePublicarAlgo(rol: Role): boolean {
  return tiposQuePublica(rol).length > 0
}

/** Puede reservar a nombre de OTRA vivienda (elige el piso al reservar). */
export function puedeReservarOtras(rol: Role): boolean {
  return tienePermiso(rol, 'reservar_otras_viviendas')
}

/** Acceso al panel de administración (= tiene panel de gestión). */
export function puedeAdmin(rol: Role): boolean {
  return esGestion(rol)
}

/** Configuración de la app y de permisos: solo app_admin (SUPERADMIN). */
export function esAppAdmin(rol: Role): boolean {
  return rol === 'app_admin'
}

/** Cuenta de pruebas: SOLO LECTURA (no puede reservar, votar, ceder ni sugerir).
 *  Única acción permitida: chatear por el buzón (si tiene 'usar_buzon'). */
export function esTester(rol: Role): boolean {
  return rol === 'tester'
}

/** Puede votar en encuestas (permiso configurable). */
export function puedeVotar(rol: Role): boolean {
  return tienePermiso(rol, 'votar_encuestas')
}

/** Puede solicitar reservas de zonas comunes (permiso configurable). */
export function puedeReservar(rol: Role): boolean {
  return tienePermiso(rol, 'realizar_reservas')
}

/** Puede iniciar chats del buzón con cualquier vecino (permiso configurable).
 *  Escribe siempre por SU canal (ver canalDeRol). */
export function puedeEscribirVecinos(rol: Role): boolean {
  return tienePermiso(rol, 'escribir_vecinos') && canalDeRol(rol) !== null
}

/** Puede moderar (aprobar/rechazar) las publicaciones que envían los vecinos. */
export function puedeModerarPublicaciones(rol: Role): boolean {
  return tienePermiso(rol, 'aprobar_incidencias') || tienePermiso(rol, 'aprobar_anuncios')
}

/** Canal del buzón que atiende cada rol (null = no atiende ninguno). */
export function canalDeRol(rol: Role): 'administrador' | 'presidencia' | 'conserje' | 'desarrollador' | null {
  switch (rol) {
    case 'app_admin': return 'desarrollador'
    case 'administrador_finca': return 'administrador'
    case 'conserje': return 'conserje'
    case 'presidente':
    case 'vicepresidente': return 'presidencia'
    default: return null
  }
}
