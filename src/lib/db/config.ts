// Configuración general de la app (feature flags) — real (Supabase).
// Lee/escribe la tabla app_config (clave→jsonb). Lectura pública (los flags no
// son sensibles y el login necesita 'acceso_directo' sin sesión); escritura solo
// app_admin (RLS, mig. 0046).
import { supabase } from '@/lib/supabase'

export interface AppConfig {
  acceso_directo: boolean
  reservas_requieren_aprobacion: boolean
  festivo_campeones: boolean
}

export const CONFIG_DEFAULT: AppConfig = {
  acceso_directo: true,
  reservas_requieren_aprobacion: false,
  festivo_campeones: false,
}

export async function getConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from('app_config').select('clave, valor')
  if (error) throw error
  const map = new Map((data ?? []).map((r) => [r.clave as string, r.valor]))
  const bool = (k: keyof AppConfig) => (map.has(k) ? map.get(k) === true : CONFIG_DEFAULT[k])
  return {
    acceso_directo: bool('acceso_directo'),
    reservas_requieren_aprobacion: bool('reservas_requieren_aprobacion'),
    festivo_campeones: bool('festivo_campeones'),
  }
}

export async function setConfig(clave: keyof AppConfig, valor: boolean): Promise<void> {
  const { error } = await supabase.from('app_config').upsert({ clave, valor, updated_at: new Date().toISOString() })
  if (error) throw error
}
