// Helpers de fecha/hora en Europe/Madrid (specs/02).

const TZ = 'Europe/Madrid'
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "12 jul 2026" a partir de un ISO date/datetime. */
export function fechaCorta(iso: string): string {
  const d = new Date(iso)
  const p = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${get('day')} ${get('month').replace('.', '')} ${get('year')}`
}

/** "sáb 12 jul · 16:00" */
export function fechaHora(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(d).replace(',', ' ·')
}

/** "16:00" */
export function hora(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

/** "16 al 31 jul" o "16 jul al 2 ago" a partir de dos ISO date. */
export function rangoFechas(iniIso: string, finIso: string): string {
  const ini = new Date(iniIso)
  const fin = new Date(finIso)
  const dIni = Number(new Intl.DateTimeFormat('es-ES', { timeZone: TZ, day: 'numeric' }).format(ini))
  const dFin = Number(new Intl.DateTimeFormat('es-ES', { timeZone: TZ, day: 'numeric' }).format(fin))
  const mIni = ini.getMonth()
  const mFin = fin.getMonth()
  if (mIni === mFin) return `${dIni} al ${dFin} ${MESES[mFin]}`
  return `${dIni} ${MESES[mIni]} al ${dFin} ${MESES[mFin]}`
}

/** Clave de día 'YYYY-MM-DD' en Europe/Madrid (para agrupar reservas por día). */
export function claveDia(iso: string): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso))
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}`
}

/** Días restantes hasta una fecha (para "cierra en X días"). */
export function diasRestantes(iso: string, ahora = new Date()): number {
  const ms = new Date(iso).getTime() - ahora.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

/** Saludo según la hora en Madrid. */
export function saludo(ahora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('es-ES', { timeZone: TZ, hour: 'numeric', hour12: false }).format(ahora))
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Iniciales (máx. 2) de un nombre completo. */
export function iniciales(nombre: string): string {
  const parts = nombre.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}
