// Utilidades compartidas del módulo de reservas (fecha/hora y disponibilidad).
import type { ZonaComun } from '@/types'

export const pad = (n: number) => String(n).padStart(2, '0')

/** Clave de día local "YYYY-MM-DD" (sin desfase UTC de toISOString). */
export const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** ISO de una hora "HH:MM" en el día indicado (hora local del dispositivo). */
export function slotISO(dia: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${dia}T00:00:00`)
  d.setHours(h, m ?? 0, 0, 0)
  return d.toISOString()
}

export const aMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0) }

export const solapa = (aIni: string, aFin: string, bIni: string, bFin: string) =>
  new Date(aIni).getTime() < new Date(bFin).getTime() && new Date(bIni).getTime() < new Date(aFin).getTime()

export type Ocup = { zona_id: string; inicio: string; fin: string; estado: 'pendiente' | 'aprobada' }
export type DispZona = { zona: ZonaComun; ok: boolean; motivo?: string }

/** Evalúa si una zona está disponible en la ventana elegida. */
export function evaluarZona(zona: ZonaComun, dia: string, desde: string, hasta: string, ocup: Ocup[]): DispZona {
  const min = zona.franja_min ?? '00:00'
  const max = zona.franja_max ?? '23:59'
  if (desde < min || hasta > max) return { zona, ok: false, motivo: `Horario permitido ${min}–${max}` }
  if (zona.duracion_max_min && aMin(hasta) - aMin(desde) > zona.duracion_max_min) {
    return { zona, ok: false, motivo: `Máx. ${Math.floor(zona.duracion_max_min / 60)}h por reserva` }
  }
  const ini = slotISO(dia, desde), fin = slotISO(dia, hasta)
  const choca = ocup.some((o) => o.zona_id === zona.id && solapa(ini, fin, o.inicio, o.fin))
  if (choca) return { zona, ok: false, motivo: 'Ocupada en ese horario' }
  return { zona, ok: true }
}

/** Rango de horas completas (whole hours) que cubren las franjas de las zonas. */
export function rangoHoras(zonas: ZonaComun[]): { lo: number; hi: number } {
  let lo = 8, hi = 23
  if (zonas.length) {
    lo = Math.min(...zonas.map((z) => Number((z.franja_min ?? '08:00').slice(0, 2))))
    hi = Math.max(...zonas.map((z) => {
      const [h, m] = (z.franja_max ?? '23:00').split(':').map(Number)
      return Math.min(23, (m || 0) > 0 ? h + 1 : h)
    }))
  }
  if (hi <= lo) hi = Math.min(23, lo + 1)
  return { lo, hi }
}
