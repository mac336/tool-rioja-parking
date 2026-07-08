// Permisos por rol (personalizables) — implementación real (Supabase).
// Lee/escribe la tabla role_permissions; la RLS solo deja MODIFICAR al app_admin
// (leer, a cualquiera). Ver migración 0010. Firmas idénticas al mock.
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types'

export async function listRolePermisos(): Promise<{ rol: Role; permiso: string }[]> {
  const { data, error } = await supabase.from('role_permissions').select('rol, permiso')
  if (error) throw error
  return (data ?? []).map((r) => ({ rol: r.rol as Role, permiso: r.permiso as string }))
}

export async function setRolePermiso(rol: Role, permiso: string, on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase.from('role_permissions').upsert({ rol, permiso })
    if (error) throw error
  } else {
    const { error } = await supabase.from('role_permissions').delete().eq('rol', rol).eq('permiso', permiso)
    if (error) throw error
  }
}
