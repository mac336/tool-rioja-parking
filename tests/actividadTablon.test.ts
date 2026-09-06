import { describe, it, expect } from 'vitest'
import { esActividadDeTablon, fechaActividad, DIAS_SUGERENCIA_EN_TABLON } from '@/features/mensajes/actividadTablon'
import type { Mensaje, MensajeTipo } from '@/types'

// Fábrica de Mensaje con defaults (solo los campos que importan al filtro).
let n = 0
function mkMensaje(over: Partial<Mensaje> & Pick<Mensaje, 'tipo' | 'created_at'>): Mensaje {
  n += 1
  return {
    id: `msg-${n}`,
    titulo: 'Título',
    cuerpo: 'Cuerpo',
    activo: true,
    ...over,
  }
}

const AHORA = new Date('2026-09-06T12:00:00Z').getTime()
const haceDias = (d: number) => new Date(AHORA - d * 864e5).toISOString()

describe('DIAS_SUGERENCIA_EN_TABLON', () => {
  it('es 30 (un mes = 30 días naturales, decisión del usuario 2026-09-06)', () => {
    expect(DIAS_SUGERENCIA_EN_TABLON).toBe(30)
  })
})

describe('fechaActividad', () => {
  it('sin updated_at → usa created_at', () => {
    const m = mkMensaje({ tipo: 'sugerencia', created_at: haceDias(5) })
    expect(fechaActividad(m)).toBe(new Date(m.created_at).getTime())
  })

  it('con updated_at posterior → usa updated_at (resucita)', () => {
    const creado = haceDias(40)
    const editado = haceDias(1)
    const m = mkMensaje({ tipo: 'sugerencia', created_at: creado, updated_at: editado })
    expect(fechaActividad(m)).toBe(new Date(editado).getTime())
  })
})

describe('esActividadDeTablon', () => {
  it('sugerencia de hoy → true', () => {
    const m = mkMensaje({ tipo: 'sugerencia', created_at: haceDias(0) })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('sugerencia de 29 días → true (dentro del mes)', () => {
    const m = mkMensaje({ tipo: 'sugerencia', created_at: haceDias(29) })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('sugerencia de exactamente 30 días → true (límite inclusive)', () => {
    const m = mkMensaje({ tipo: 'sugerencia', created_at: haceDias(30) })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('sugerencia de 31 días → false (sale del tablón principal)', () => {
    const m = mkMensaje({ tipo: 'sugerencia', created_at: haceDias(31) })
    expect(esActividadDeTablon(m, AHORA)).toBe(false)
  })

  it('sugerencia de 31 días pero EDITADA ayer → true (resucita)', () => {
    const m = mkMensaje({ tipo: 'sugerencia', created_at: haceDias(31), updated_at: haceDias(1) })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('incidencia de 6 meses → true (siempre, sin límite de antigüedad)', () => {
    const m = mkMensaje({ tipo: 'incidencia', created_at: haceDias(182) })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('aviso caducado (expira_at en el pasado) → false', () => {
    const m = mkMensaje({ tipo: 'aviso', created_at: haceDias(10), expira_at: haceDias(1) })
    expect(esActividadDeTablon(m, AHORA)).toBe(false)
  })

  it('aviso con expira_at futuro → true (vigente aunque sea antiguo)', () => {
    const m = mkMensaje({ tipo: 'aviso', created_at: haceDias(60), expira_at: new Date(AHORA + 5 * 864e5).toISOString() })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('anuncio de 3 días sin caducidad → false (fuera de la ventana de 2 días)', () => {
    const m = mkMensaje({ tipo: 'anuncio', created_at: haceDias(3) })
    expect(esActividadDeTablon(m, AHORA)).toBe(false)
  })

  it('anuncio de 1 día sin caducidad → true (reciente)', () => {
    const m = mkMensaje({ tipo: 'anuncio', created_at: haceDias(1) })
    expect(esActividadDeTablon(m, AHORA)).toBe(true)
  })

  it('tipo desconocido/otro cae en la regla de "reciente" (2 días)', () => {
    const reciente = mkMensaje({ tipo: 'anuncio' as MensajeTipo, created_at: haceDias(1) })
    const viejo = mkMensaje({ tipo: 'anuncio' as MensajeTipo, created_at: haceDias(5) })
    expect(esActividadDeTablon(reciente, AHORA)).toBe(true)
    expect(esActividadDeTablon(viejo, AHORA)).toBe(false)
  })
})
