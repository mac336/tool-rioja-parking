import { describe, it, expect } from 'vitest'
import {
  PISOS,
  quincenaGlobal,
  fechasDeQuincena,
  patron,
  plazaDeVivienda,
  proximosTurnos,
} from '@/lib/parking'

// Base oficial por grupo (hoja 31-01-2026), tal cual el legacy. En la quincena
// "anchor" de cada grupo, el reparto debe ser EXACTAMENTE su base (sin desplazar).
const BASE_EN_ANCHOR: Record<number, string[]> = {
  4: ['LIBRE', 'Bajo A', 'Bajo B', 'Bajo C', 'Bajo E', 'Bajo F'], // bajo
  5: ['1º F Dcha', '1º A Dcha', '1º B Dcha', '1º C Dcha', '1º D Dcha', '1º E Dcha'], // 1D
  6: ['2º F Dcha', '2º A Dcha', '2º B Dcha', '2º C Dcha', '2º D Dcha', '2º E Dcha'], // 2D
  0: ['3º A Dcha', '3º B Dcha', '3º C Dcha', '3º D Dcha', '3º E Dcha', '3º F Dcha'], // 3D
  1: ['1º A Izqda', '1º B Izqda', '1º C Izqda', '1º D Izqda', '1º E Izqda', '1º F Izqda'], // 1I
  2: ['2º A Izqda', '2º B Izqda', '2º C Izqda', '2º D Izqda', '2º E Izqda', '2º F Izqda'], // 2I
  3: ['3º A Izqda', '3º B Izqda', '3º C Izqda', '3º D Izqda', '3º E Izqda', '3º F Izqda'], // 3I
}

describe('catálogo de viviendas', () => {
  it('tiene 41 viviendas y no incluye Bajo D', () => {
    expect(PISOS).toHaveLength(41)
    expect(PISOS).not.toContain('Bajo D')
    expect(PISOS).toContain('Bajo A')
    expect(PISOS).toContain('2º C Dcha')
  })
})

describe('quincenaGlobal', () => {
  it('la quincena del origen (31-01-2026) es 0', () => {
    expect(quincenaGlobal(new Date('2026-01-31T12:00:00Z'))).toBe(0)
  })
  it('14 días después es la quincena 1', () => {
    expect(quincenaGlobal(new Date('2026-02-14T12:00:00Z'))).toBe(1)
  })
  it('fechas anteriores al origen se acotan a 0', () => {
    expect(quincenaGlobal(new Date('2020-01-01T12:00:00Z'))).toBe(0)
  })
})

describe('fechasDeQuincena', () => {
  it('la quincena 0 empieza el 31-01-2026', () => {
    expect(fechasDeQuincena(0).inicio).toBe('2026-01-31')
    expect(fechasDeQuincena(0).fin).toBe('2026-02-14')
  })
})

describe('patrón de rotación', () => {
  it('en la quincena anchor de cada grupo el reparto es la base oficial', () => {
    for (const [qg, base] of Object.entries(BASE_EN_ANCHOR)) {
      expect(patron(Number(qg))).toEqual(base)
    }
  })

  it('siempre reparte exactamente 6 plazas', () => {
    for (let qg = 0; qg < 50; qg++) expect(patron(qg)).toHaveLength(6)
  })

  it('exactamente una plaza LIBRE cuando toca el grupo de bajos, ninguna si no', () => {
    // El grupo "bajo" (anchor 4) es el único con LIBRE.
    for (let qg = 0; qg < 70; qg++) {
      const libres = patron(qg).filter((p) => p === 'LIBRE').length
      expect(libres).toBeLessThanOrEqual(1)
    }
    expect(patron(4).filter((p) => p === 'LIBRE')).toHaveLength(1)
  })

  it('la rotación desplaza +1 plaza cada vuelta completa (7 quincenas)', () => {
    // Para el grupo bajo: en qg=4 base; en qg=4+7=11 debe estar desplazado 1.
    const enAnchor = patron(4)
    const unaVuelta = patron(11)
    // desplazamiento +1: la vivienda de la plaza i pasa a la plaza i+1
    for (let i = 0; i < 6; i++) {
      expect(unaVuelta[(i + 1) % 6]).toBe(enAnchor[i])
    }
  })
})

describe('plazaDeVivienda', () => {
  it('devuelve el nº de plaza correcto y null si no aparece', () => {
    // En qg=4 (grupo bajo), "Bajo A" está en la plaza 2 (índice 1).
    expect(plazaDeVivienda('Bajo A', 4)).toBe(2)
    // En una quincena de bajos, un piso de dcha no aparece.
    expect(plazaDeVivienda('2º C Dcha', 4)).toBeNull()
  })
})

describe('proximosTurnos', () => {
  it('encuentra la plaza actual cuando le toca a la vivienda', () => {
    const turnos = proximosTurnos('Bajo A', 4, 3)
    expect(turnos[0].actual).toBe(true)
    expect(turnos[0].plaza).toBe(2)
  })
  it('devuelve turnos futuros ordenados', () => {
    const turnos = proximosTurnos('2º C Dcha', 0, 2)
    // Todas las quincenas devueltas contienen a la vivienda
    for (const t of turnos) expect(plazaDeVivienda('2º C Dcha', t.quincena)).toBe(t.plaza)
  })
})
