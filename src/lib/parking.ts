// Rotación de plazas de parking — PORT EXACTO de la lógica del index.html legacy.
// 6 plazas exteriores, quincenas de 14 días desde 2026-01-31, ciclo continuo de 7
// grupos con desplazamiento +1 plaza por vuelta. NO alterar la matemática: cambia
// el reparto real de la comunidad. Ver specs/08-modulo-parking.md.
//
// Diferencia con el legacy: el cómputo de "hoy" y de las fechas de quincena se hace
// en calendario Europe/Madrid (specs/02) para no depender de la TZ del servidor.

import type { ParkingQuincena, ParkingPlaza } from '@/types'

const DIAS_QUINCENA = 14
const MS_DIA = 86_400_000

// Origen de cálculo: 31-01-2026 (día natural en Madrid).
const INICIO_DAYNUM = Math.floor(Date.UTC(2026, 0, 31) / MS_DIA)

const CICLO = ['bajo', '1D', '2D', '3D', '1I', '2I', '3I'] as const

const GRUPO: Record<string, { anchor: number; base: string[] }> = {
  bajo: { anchor: 4, base: ['LIBRE', 'Bajo A', 'Bajo B', 'Bajo C', 'Bajo E', 'Bajo F'] },
  '1D': { anchor: 5, base: ['1º F Dcha', '1º A Dcha', '1º B Dcha', '1º C Dcha', '1º D Dcha', '1º E Dcha'] },
  '2D': { anchor: 6, base: ['2º F Dcha', '2º A Dcha', '2º B Dcha', '2º C Dcha', '2º D Dcha', '2º E Dcha'] },
  '3D': { anchor: 0, base: ['3º A Dcha', '3º B Dcha', '3º C Dcha', '3º D Dcha', '3º E Dcha', '3º F Dcha'] },
  '1I': { anchor: 1, base: ['1º A Izqda', '1º B Izqda', '1º C Izqda', '1º D Izqda', '1º E Izqda', '1º F Izqda'] },
  '2I': { anchor: 2, base: ['2º A Izqda', '2º B Izqda', '2º C Izqda', '2º D Izqda', '2º E Izqda', '2º F Izqda'] },
  '3I': { anchor: 3, base: ['3º A Izqda', '3º B Izqda', '3º C Izqda', '3º D Izqda', '3º E Izqda', '3º F Izqda'] },
}

/** Catálogo de las 41 viviendas (idéntico al array PISOS del legacy). */
export const PISOS: string[] = [
  'Bajo A', 'Bajo B', 'Bajo C', 'Bajo E', 'Bajo F',
  '1º A Dcha', '1º B Dcha', '1º C Dcha', '1º D Dcha', '1º E Dcha', '1º F Dcha',
  '2º A Dcha', '2º B Dcha', '2º C Dcha', '2º D Dcha', '2º E Dcha', '2º F Dcha',
  '3º A Dcha', '3º B Dcha', '3º C Dcha', '3º D Dcha', '3º E Dcha', '3º F Dcha',
  '1º A Izqda', '1º B Izqda', '1º C Izqda', '1º D Izqda', '1º E Izqda', '1º F Izqda',
  '2º A Izqda', '2º B Izqda', '2º C Izqda', '2º D Izqda', '2º E Izqda', '2º F Izqda',
  '3º A Izqda', '3º B Izqda', '3º C Izqda', '3º D Izqda', '3º E Izqda', '3º F Izqda',
]

/** Número de día (UTC) del calendario Europe/Madrid de una fecha dada. */
function madridDayNumber(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = Number(parts.find((p) => p.type === 'year')!.value)
  const m = Number(parts.find((p) => p.type === 'month')!.value)
  const d = Number(parts.find((p) => p.type === 'day')!.value)
  return Math.floor(Date.UTC(y, m - 1, d) / MS_DIA)
}

/** Índice de quincena global de una fecha (0 = quincena que arranca el 31-01-2026). */
export function quincenaGlobal(date: Date = new Date()): number {
  const diff = madridDayNumber(date) - INICIO_DAYNUM
  return diff < 0 ? 0 : Math.floor(diff / DIAS_QUINCENA)
}

/** Fechas (ISO YYYY-MM-DD) de inicio y fin de una quincena. */
export function fechasDeQuincena(qg: number): { inicio: string; fin: string } {
  const iniDay = INICIO_DAYNUM + qg * DIAS_QUINCENA
  const finDay = iniDay + DIAS_QUINCENA
  const iso = (dayNum: number) => new Date(dayNum * MS_DIA).toISOString().slice(0, 10)
  return { inicio: iso(iniDay), fin: iso(finDay) }
}

function cyclePos(qg: number): number {
  return (((qg + 3) % 7) + 7) % 7
}

/** Reparto de las 6 plazas en una quincena: índice de plaza (0..5) → vivienda o "LIBRE". */
export function patron(qg: number): string[] {
  const g = GRUPO[CICLO[cyclePos(qg)]]
  const s = Math.round((qg - g.anchor) / 7) // nº de ciclos completos
  return g.base.map((_, idx) => g.base[(((idx - s) % 6) + 6) % 6])
}

/** Info completa de una quincena como objeto de dominio. */
export function quincenaInfo(qg: number, ahora: number = quincenaGlobal()): ParkingQuincena {
  const { inicio, fin } = fechasDeQuincena(qg)
  const plazas: ParkingPlaza[] = patron(qg).map((v, i) => ({
    numero: i + 1,
    vivienda: v === 'LIBRE' ? null : v,
  }))
  return { indice: qg, inicio, fin, plazas, actual: qg === ahora }
}

/** Nº de plaza (1..6) que le toca a una vivienda en una quincena, o null. */
export function plazaDeVivienda(vivienda: string, qg: number): number | null {
  const idx = patron(qg).indexOf(vivienda)
  return idx >= 0 ? idx + 1 : null
}

/** Próximas N quincenas desde la actual (incluida). */
export function proximasQuincenas(n: number, desde: number = quincenaGlobal()): ParkingQuincena[] {
  const out: ParkingQuincena[] = []
  for (let i = 0; i < n; i++) out.push(quincenaInfo(desde + i, desde))
  return out
}

/** Próximos turnos de una vivienda: la actual (si toca) + siguientes hasta `max` aciertos. */
export function proximosTurnos(
  vivienda: string,
  desde: number = quincenaGlobal(),
  max = 3,
): { quincena: number; plaza: number; inicio: string; fin: string; actual: boolean }[] {
  const out: { quincena: number; plaza: number; inicio: string; fin: string; actual: boolean }[] = []
  const actual = plazaDeVivienda(vivienda, desde)
  if (actual) {
    const { inicio, fin } = fechasDeQuincena(desde)
    out.push({ quincena: desde, plaza: actual, inicio, fin, actual: true })
  }
  for (let k = 1; k <= 22 && out.length < max + (actual ? 1 : 0); k++) {
    const qg = desde + k
    const plaza = plazaDeVivienda(vivienda, qg)
    if (plaza) {
      const { inicio, fin } = fechasDeQuincena(qg)
      out.push({ quincena: qg, plaza, inicio, fin, actual: false })
    }
  }
  return out
}
