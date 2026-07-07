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

/** Roles que forman el grupo de gestión (ven colas de moderación/aprobación). */
export function esGestion(rol: Role): boolean {
  return rol !== 'vecino'
}

/** Puede aprobar/publicar anuncios (toda la gestión). */
export function puedeAprobarAnuncios(rol: Role): boolean {
  return esGestion(rol)
}

/** Puede aprobar/rechazar reservas (presidente + app_admin). */
export function puedeAprobarReservas(rol: Role): boolean {
  return rol === 'presidente' || rol === 'app_admin'
}

/** Puede aprobar altas de acceso. */
export function puedeAprobarAltas(rol: Role): boolean {
  return rol === 'app_admin' || rol === 'presidente' || rol === 'administrador_finca'
}

/** Acceso al panel de administración. */
export function puedeAdmin(rol: Role): boolean {
  return esGestion(rol)
}

/** Configuración de la app (zonas, roles): solo app_admin. */
export function esAppAdmin(rol: Role): boolean {
  return rol === 'app_admin'
}
