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
  vecino: 'Vecino',
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
export type Permiso = 'panel' | 'aprobar_altas' | 'aprobar_reservas' | 'publicar_mensajes'

export const CATALOGO_PERMISOS: { key: Permiso; label: string; desc: string }[] = [
  { key: 'panel', label: 'Panel de gestión', desc: 'Acceder al panel y al buzón de administración' },
  { key: 'publicar_mensajes', label: 'Publicar mensajes', desc: 'Crear avisos, anuncios e incidencias para toda la comunidad' },
  { key: 'aprobar_altas', label: 'Aprobar altas y gestionar vecinos', desc: 'Aprobar solicitudes, editar, suspender y dar de baja' },
  { key: 'aprobar_reservas', label: 'Aprobar reservas', desc: 'Aprobar o rechazar reservas de zonas comunes' },
]

// Defaults (deben coincidir con la semilla de la migración 0010) — solo se usan
// como respaldo en modo demo o mientras no ha cargado la matriz real.
const DEFAULTS: Record<Permiso, Role[]> = {
  panel: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta'],
  publicar_mensajes: ['app_admin', 'presidente', 'vicepresidente', 'administrador_finca', 'junta'],
  aprobar_altas: ['app_admin', 'presidente', 'administrador_finca'],
  aprobar_reservas: ['app_admin', 'presidente'],
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
