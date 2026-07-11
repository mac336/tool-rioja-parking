// Parking (cesiones) — implementación real (Supabase). La rotación de plazas
// (parkingProximas / parkingMisTurnos) es cálculo puro sobre `@/lib/parking`; solo
// las cesiones viven en BD. La escritura/visibilidad la gatea RLS.
import { supabase } from '@/lib/supabase'
import type { ParkingCesion, CesionTipo } from '@/types'
import { proximosTurnos } from '@/lib/parking'

// ---- Sesión: vivienda del usuario actual -------------------------------------
async function viviendaActual(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase.from('profiles')
    .select('vivienda').eq('id', user.id).single()
  if (error) throw error
  if (!data?.vivienda) throw new Error('El usuario no tiene vivienda asignada.')
  return data.vivienda as string
}

// ---- Rotación (cálculo puro, NO BD) ------------------------------------------
export async function parkingMisTurnos(): Promise<ReturnType<typeof proximosTurnos>> {
  const vivienda = await viviendaActual()
  return proximosTurnos(vivienda)
}

// ---- Cesiones ----------------------------------------------------------------
export async function misCesiones(): Promise<ParkingCesion[]> {
  const vivienda = await viviendaActual()
  const { data, error } = await supabase.from('parking_cesiones')
    .select('*').eq('vivienda', vivienda).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ParkingCesion[]
}

export async function cesionesActivas(): Promise<ParkingCesion[]> {
  const { data, error } = await supabase.from('parking_cesiones')
    .select('*').eq('estado', 'activa').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ParkingCesion[]
}

export async function crearCesion(input: {
  tipo: CesionTipo; desde: string; hasta: string; nota?: string
}): Promise<ParkingCesion> {
  const vivienda = await viviendaActual()
  const { data, error } = await supabase.from('parking_cesiones')
    .insert({
      vivienda, tipo: input.tipo, desde: input.desde, hasta: input.hasta,
      nota: input.nota, estado: 'activa',
    })
    .select('*').single()
  if (error) throw error
  return data as ParkingCesion
}

export async function cancelarCesion(id: string): Promise<void> {
  const { error } = await supabase.from('parking_cesiones')
    .update({ estado: 'cancelada' }).eq('id', id).eq('estado', 'activa')
  if (error) throw error
}

export async function reasignarCesion(id: string, viviendaDestino: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('parking_cesiones')
    .update({ estado: 'reasignada', reasignada_a: viviendaDestino, gestionada_por: user.id })
    .eq('id', id)
  if (error) throw error
}

export async function demandaParking(): Promise<{ necesitan: number; ceden: number }> {
  const activas = await cesionesActivas()
  const necesitan = new Set(activas.filter((c) => c.tipo === 'necesita').map((c) => c.vivienda)).size
  const ceden = new Set(activas.filter((c) => c.tipo !== 'necesita').map((c) => c.vivienda)).size
  return { necesitan, ceden }
}
