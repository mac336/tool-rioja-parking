// Paleta y helpers del "Tablón de la comunidad" (diseño 2a del handoff).
// Los papeles son claros a propósito (notas de papel), legibles sobre el tablón
// en claro y oscuro; la tinta va oscura sobre el papel.
import type { MensajeTipo, EstiloTemporada } from '@/types'

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
  sugerencia: { etiqueta: 'Sugerencia', paper: '#F1ECFB', paperBajo: '#E1D8F3', pin: '#7A4FC0', pinHi: '#B79BEA', tint: '#6D4AA3', autor: 'un vecino' },
}

// ---- Estilos estacionales (decoración opcional del post-it) ------------------
export type MotivoKey = 'flor' | 'sol' | 'hoja' | 'calabaza' | 'copo' | 'mascara' | 'vela' | 'corazon' | 'warning' | 'problem'
export interface Temporada {
  etiqueta: string
  paper: string
  tint: string
  pin: string
  pinHi: string
  deco: string
  motivo: MotivoKey
}

export const TEMPORADAS: Record<EstiloTemporada, Temporada> = {
  primavera: { etiqueta: 'Primavera', paper: '#EDF7E4', tint: '#4C8A3F', pin: '#6FBF57', pinHi: '#B7E3A6', deco: '#E88AB8', motivo: 'flor' },
  verano: { etiqueta: 'Verano', paper: '#FFF6D6', tint: '#9C6B12', pin: '#F2793B', pinHi: '#FFC08A', deco: '#2BB0C0', motivo: 'sol' },
  otono: { etiqueta: 'Otoño', paper: '#F9EDDC', tint: '#9A5B24', pin: '#C06B2E', pinHi: '#EBB284', deco: '#7A4A24', motivo: 'hoja' },
  halloween: { etiqueta: 'Halloween', paper: '#FFE9CF', tint: '#8A4A12', pin: '#4A3568', pinHi: '#8F76BE', deco: '#4A3568', motivo: 'calabaza' },
  navidad: { etiqueta: 'Navidad', paper: '#FCEFEF', tint: '#B03A3A', pin: '#1C8560', pinHi: '#7FD3A2', deco: '#1C8560', motivo: 'copo' },
  valentin: { etiqueta: 'S. Valentín', paper: '#FDEAF1', tint: '#C2426E', pin: '#C2426E', pinHi: '#F0A2C0', deco: '#E88AB8', motivo: 'corazon' },
  carnaval: { etiqueta: 'Carnaval', paper: '#F3EAFB', tint: '#7A4FC0', pin: '#F5B417', pinHi: '#FFDF80', deco: '#EE7A61', motivo: 'mascara' },
  ssanta: { etiqueta: 'S. Santa', paper: '#F0EDFA', tint: '#6B4E9E', pin: '#6B4E9E', pinHi: '#B79BEA', deco: '#C9A54A', motivo: 'vela' },
  warning: { etiqueta: 'Warning', paper: '#FFF6D6', tint: '#9A6B12', pin: '#EAB308', pinHi: '#FDE68A', deco: '#E0A22E', motivo: 'warning' },
  problem: { etiqueta: 'Problem', paper: '#FDECEC', tint: '#C0392B', pin: '#D2453E', pinHi: '#F3A9A2', deco: '#A3341F', motivo: 'problem' },
}

/** Orden del selector del formulario. */
export const TEMPORADAS_ORDEN: EstiloTemporada[] = ['primavera', 'verano', 'otono', 'halloween', 'navidad', 'valentin', 'carnaval', 'ssanta', 'warning', 'problem']

/** Colores de importancia (media = importante/ámbar, alta = urgente/rojo). */
export const IMPORTANCIA_COLOR = { media: '#CF8A17', alta: '#D2453E' } as const

/** Papel degradado de temporada (sustituye el color plano). */
export const paperDegradado = (paper: string, tint: string) =>
  `linear-gradient(175deg, ${paper}, color-mix(in srgb, ${paper} 82%, ${tint}))`
/** Cinta washi de temporada (sustituye a la chincheta). */
export const cintaWashi = (pin: string, deco: string) =>
  `repeating-linear-gradient(45deg, ${pin}cc 0 6px, ${deco}b3 6px 12px)`
/** Cinta de obra roja (urgente) — sustituye a la de temporada. */
export const CINTA_URGENTE = 'repeating-linear-gradient(45deg, #D2453Ecc 0 7px, #FFF3F1e6 7px 14px)'

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
