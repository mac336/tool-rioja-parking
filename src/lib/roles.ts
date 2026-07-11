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
export type Permiso = 'panel' | 'aprobar_altas' | 'aprobar_reservas' | 'publicar_mensajes' | 'usar_buzon' | 'votar_encuestas' | 'realizar_reservas' | 'escribir_vecinos'

export const CATALOGO_PERMISOS: { key: Permiso; label: string; desc: string }[] = [
  { key: 'panel', label: 'Panel de gestión', desc: 'Acceder al panel y al buzón de administración' },
  { key: 'publicar_mensajes', label: 'Publicar mensajes', desc: 'Crear avisos, anuncios e incidencias para toda la comunidad' },
  { key: 'aprobar_altas', label: 'Aprobar altas y gestionar vecinos', desc: 'Aprobar solicitudes, editar, suspender y dar de baja' },
  { key: 'aprobar_reservas', label: 'Aprobar reservas', desc: 'Aprobar o rechazar reservas de zonas comunes' },
  { key: 'usar_buzon', label: 'Chatear por el buzón', desc: 'Escribir mensajes privados por los canales del buzón' },
  { key: 'votar_encuestas', label: 'Votar en encuestas', desc: 'Emitir voto en las votaciones de la comunidad' },
  { key: 'realizar_reservas', label: 'Realizar reservas', desc: 'Solicitar reservas de zonas comunes' },
  { key: 'escribir_vecinos', label: 'Escribir a los vecinos', desc: 'Iniciar chats del buzón con cualquier vecino (en su canal: Administración/Conserje/Presidencia/Desarrollador)' },
]

// Defaults (deben coincidir con la semilla de la migración 0010) — solo se usan
// como respaldo en modo demo o mientras no ha cargado la matriz real.
const DEFAULTS: Record<Permiso, Role[]> = {
  panel: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta'],
  publicar_mensajes: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta'],
  aprobar_altas: ['app_admin', 'presidente', 'administrador_finca'],
  aprobar_reservas: ['app_admin', 'presidente'],
  usar_buzon: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino', 'tester'],
  votar_encuestas: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino'],
  realizar_reservas: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta', 'conserje', 'vecino'],
  escribir_vecinos: ['app_admin', 'administrador_finca', 'conserje'],
}

/** Matriz de permisos por defecto (para el modo demo / semilla del mock). */
export function permisosPorDefecto(): { rol: Role; permiso: Permiso }[] {
  const out: { rol: Role; permiso: Permiso }[] = []
  for (const { key } of CATALOGO_PERMISOS) for (const rol of DEFAULTS[key]) out.push({ rol, permiso: key })
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

/** Puede aprobar/rechazar reservas. */
export function puedeAprobarReservas(rol: Role): boolean {
  return tienePermiso(rol, 'aprobar_reservas')
}

/** Puede aprobar altas de acceso y gestionar vecinos. */
export function puedeAprobarAltas(rol: Role): boolean {
  return tienePermiso(rol, 'aprobar_altas')
}

/** Puede publicar mensajes (avisos/anuncios/incidencias) a la comunidad. */
export function puedePublicarMensajes(rol: Role): boolean {
  return tienePermiso(rol, 'publicar_mensajes')
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

/** Puede escribir por el buzón (chat privado). */
export function puedeUsarBuzon(rol: Role): boolean {
  return tienePermiso(rol, 'usar_buzon')
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
