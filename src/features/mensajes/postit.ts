// Paleta y helpers del "Tablón de la comunidad" (diseño 2a del handoff).
// Los papeles son claros a propósito (notas de papel), legibles sobre el tablón
// en claro y oscuro; la tinta va oscura sobre el papel.
import type { MensajeTipo } from '@/types'

export interface EstiloPostit {
  etiqueta: string
  paper: string
  paperBajo: string
  pin: string
  pinHi: string
  tint: string
  autor: string
}

export const POSTIT: Record<MensajeTipo, EstiloPostit> = {
  aviso: { etiqueta: 'Aviso', paper: '#FFF7DF', paperBajo: '#F3E7BF', pin: '#C33B2C', pinHi: '#F08A7E', tint: '#8A5A0F', autor: 'la Junta' },
  anuncio: { etiqueta: 'Anuncio', paper: '#FFFFFF', paperBajo: '#E8ECEF', pin: '#2F5FA3', pinHi: '#7FB4E8', tint: '#177E8B', autor: 'la Junta' },
  incidencia: { etiqueta: 'Incidencia', paper: '#FFF1EE', paperBajo: '#F2DBD5', pin: '#1B9E5A', pinHi: '#7FD3A2', tint: '#A3341F', autor: 'Conserjería' },
}

export const ORDEN_TIPOS: MensajeTipo[] = ['aviso', 'anuncio', 'incidencia']
export const PLURAL: Record<MensajeTipo, string> = { aviso: 'Avisos', anuncio: 'Anuncios', incidencia: 'Incidencias' }

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fecha manuscrita: "hoy" / "ayer" / "10 jul". */
export function fechaMano(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dd = new Date(d); dd.setHours(0, 0, 0, 0)
  const dias = Math.round((hoy.getTime() - dd.getTime()) / 864e5)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `${d.getDate()} ${MES[d.getMonth()]}`
}

/** "caduca en N días" (o "caduca hoy") para avisos con expira_at. */
export function caducaTexto(expiraIso: string): string {
  const dias = Math.ceil((new Date(expiraIso).getTime() - Date.now()) / 864e5)
  if (dias <= 0) return 'caduca hoy'
  if (dias === 1) return 'caduca mañana'
  return `caduca en ${dias} días`
}
