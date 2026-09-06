import { describe, it, expect } from 'vitest'
import {
  seleccionarGadgets,
  diasEntre,
  textoDia,
  esPasado,
  particionarEventos,
  recordatorioCalendario,
  type CandidatoGadget,
} from '@/features/home/gadgetsHome'
import type { EventoCalendario } from '@/types'

// Fábrica de EventoCalendario con defaults, para no repetir los 9 campos en
// cada caso (specs/21 § Modelo de datos).
let n = 0
function mkEvento(over: Partial<EventoCalendario> & Pick<EventoCalendario, 'tipo' | 'titulo' | 'fecha'>): EventoCalendario {
  n += 1
  return {
    id: `ev-${n}`,
    nota: null,
    fecha_fin: null,
    fuente: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

const HOY = '2026-09-05'

describe('seleccionarGadgets', () => {
  const parking: CandidatoGadget = { clave: 'parking', prioridad: 1, datos: 'parking' }
  const reserva: CandidatoGadget = { clave: 'reserva', prioridad: 2, datos: 'reserva' }
  const calendario: CandidatoGadget = { clave: 'calendario', prioridad: 3, datos: 'calendario' }

  it('C14 · 3 candidatos con cupo lleno (parking+reserva) → SIN calendario', () => {
    expect(seleccionarGadgets([parking, reserva, calendario])).toEqual([parking, reserva])
  })

  it('C15 · solo reserva + calendario (hueco libre) → reserva y calendario en ese orden', () => {
    expect(seleccionarGadgets([reserva, calendario])).toEqual([reserva, calendario])
  })

  it('ninguno de parking/reserva presente → solo calendario', () => {
    expect(seleccionarGadgets([null, undefined, calendario])).toEqual([calendario])
  })

  it('ignora null y undefined mezclados con candidatos válidos', () => {
    expect(seleccionarGadgets([null, parking, undefined, reserva])).toEqual([parking, reserva])
  })

  it('cupo por defecto es 2 (no hace falta pasarlo)', () => {
    expect(seleccionarGadgets([parking, reserva, calendario])).toHaveLength(2)
  })

  it('cupo explícito distinto de 2 se respeta', () => {
    expect(seleccionarGadgets([parking, reserva, calendario], 1)).toEqual([parking])
    expect(seleccionarGadgets([parking, reserva, calendario], 3)).toEqual([parking, reserva, calendario])
  })

  it('ordena por prioridad ascendente de forma estable (empates conservan el orden de entrada)', () => {
    const a: CandidatoGadget = { clave: 'calendario', prioridad: 1, datos: 'a' }
    const b: CandidatoGadget = { clave: 'calendario', prioridad: 1, datos: 'b' }
    expect(seleccionarGadgets([b, a], 2)).toEqual([b, a])
  })

  it('C24 · refactor sin cambio visual: [parking, reserva] con cupo 2 devuelve ambos en ese orden', () => {
    expect(seleccionarGadgets([parking, reserva], 2)).toEqual([parking, reserva])
  })

  it('lista vacía → []', () => {
    expect(seleccionarGadgets([])).toEqual([])
  })
})

describe('diasEntre', () => {
  it('cuenta días naturales sin depender de la hora ni del DST (24→26 oct = 2, cruza el cambio de hora de España)', () => {
    expect(diasEntre('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('mismo día → 0', () => {
    expect(diasEntre('2026-09-05', '2026-09-05')).toBe(0)
  })

  it('3 días hacia delante', () => {
    expect(diasEntre('2026-09-05', '2026-09-08')).toBe(3)
  })

  it('admite diferencias negativas (hasta anterior a desde)', () => {
    expect(diasEntre('2026-09-08', '2026-09-05')).toBe(-3)
  })

  it('cruza fin de mes y de año sin desviarse', () => {
    expect(diasEntre('2025-12-30', '2026-01-02')).toBe(3)
  })
})

describe('textoDia', () => {
  it("'2026-09-22' → '22 de septiembre'", () => {
    expect(textoDia('2026-09-22')).toBe('22 de septiembre')
  })

  it("'2026-01-01' → '1 de enero'", () => {
    expect(textoDia('2026-01-01')).toBe('1 de enero')
  })
})

describe('esPasado', () => {
  it('pasado = coalesce(fecha_fin, fecha) < hoy; hoy mismo NO es pasado', () => {
    expect(esPasado({ fecha: '2026-09-05', fecha_fin: null }, '2026-09-05')).toBe(false)
  })

  it('un día antes de hoy SÍ es pasado', () => {
    expect(esPasado({ fecha: '2026-09-04', fecha_fin: null }, '2026-09-05')).toBe(true)
  })

  it('un día después de hoy NO es pasado', () => {
    expect(esPasado({ fecha: '2026-09-06', fecha_fin: null }, '2026-09-05')).toBe(false)
  })

  it('con fecha_fin: usa fecha_fin, no fecha, para decidir si ya pasó', () => {
    // empezó antes de hoy pero termina hoy → NO pasado todavía
    expect(esPasado({ fecha: '2026-09-01', fecha_fin: '2026-09-05' }, '2026-09-05')).toBe(false)
    // terminó ayer → SÍ pasado
    expect(esPasado({ fecha: '2026-09-01', fecha_fin: '2026-09-04' }, '2026-09-05')).toBe(true)
  })

  it('C18 · medianoche Madrid: la comparación es por clave de día, no por hora del dispositivo (23:59 del 04 vs 00:00 del 05 dan el mismo resultado si "hoy" es la misma clave)', () => {
    // El caller pasa siempre hoy=claveDia(ahora); la función en sí solo compara
    // claves de día, así que un evento del 08 no es pasado ni el día 04 ni el 05.
    expect(esPasado({ fecha: '2026-09-08', fecha_fin: null }, '2026-09-04')).toBe(false)
    expect(esPasado({ fecha: '2026-09-08', fecha_fin: null }, '2026-09-05')).toBe(false)
  })
})

describe('particionarEventos', () => {
  it('C27 · festivo pasado (ayer) → NO aparece ni en próximos ni en pasados', () => {
    const festivo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: '2026-09-04' })
    const { proximos, pasados } = particionarEventos([festivo], HOY)
    expect(proximos).toEqual([])
    expect(pasados).toEqual([])
  })

  it('C28 · comunidad pasado (ayer) → va a "pasados"', () => {
    const comunidad = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-04' })
    const { proximos, pasados } = particionarEventos([comunidad], HOY)
    expect(proximos).toEqual([])
    expect(pasados).toEqual([comunidad])
  })

  it('festivo de hoy → va a "próximos" (no es pasado)', () => {
    const festivo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: HOY })
    const { proximos, pasados } = particionarEventos([festivo], HOY)
    expect(proximos).toEqual([festivo])
    expect(pasados).toEqual([])
  })

  it('evento en curso (empezó antes de hoy, fecha_fin >= hoy) → va a "próximos"', () => {
    const enCurso = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-01', fecha_fin: HOY })
    const { proximos, pasados } = particionarEventos([enCurso], HOY)
    expect(proximos).toEqual([enCurso])
    expect(pasados).toEqual([])
  })

  it('mezcla: festivo pasado se descarta, comunidad pasado se conserva, ambos próximos se mantienen', () => {
    const festivoPasado = mkEvento({ tipo: 'festivo', titulo: 'Asunción de la Virgen', fecha: '2026-08-15' })
    const comunidadPasado = mkEvento({ tipo: 'comunidad', titulo: 'Junta ordinaria', fecha: '2026-09-01' })
    const festivoFuturo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: '2026-10-12' })
    const comunidadFuturo = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-08' })
    const { proximos, pasados } = particionarEventos(
      [festivoPasado, comunidadPasado, festivoFuturo, comunidadFuturo],
      HOY,
    )
    expect(proximos).toEqual([festivoFuturo, comunidadFuturo])
    expect(pasados).toEqual([comunidadPasado])
  })

  it('lista vacía → ambos arrays vacíos', () => {
    expect(particionarEventos([], HOY)).toEqual({ proximos: [], pasados: [] })
  })
})

describe('recordatorioCalendario', () => {
  it('lista vacía → null', () => {
    expect(recordatorioCalendario([], HOY)).toBeNull()
  })

  it('null/undefined → null (tolera datos aún no cargados)', () => {
    expect(recordatorioCalendario(null, HOY)).toBeNull()
    expect(recordatorioCalendario(undefined, HOY)).toBeNull()
  })

  it('C9 · festivo hoy → overline "Festivo", detalle null', () => {
    const festivo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: '2026-10-12' })
    const r = recordatorioCalendario([festivo], '2026-10-12')
    expect(r).not.toBeNull()
    expect(r).toMatchObject({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', overline: 'Festivo', detalle: null })
  })

  it('C10 · festivo mañana (d=1) → no es candidato → null', () => {
    const festivo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: '2026-10-12' })
    expect(recordatorioCalendario([festivo], '2026-10-11')).toBeNull()
  })

  it('festivo ayer (d=-1) → no es candidato → null', () => {
    const festivo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: '2026-10-12' })
    expect(recordatorioCalendario([festivo], '2026-10-13')).toBeNull()
  })

  it('C11 · comunidad a 3 días → overline "Calendario", detalle "en 3 días"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-08' })
    const r = recordatorioCalendario([e], '2026-09-05')
    expect(r).toMatchObject({ tipo: 'comunidad', titulo: 'Cierre de la piscina', overline: 'Calendario', detalle: 'en 3 días' })
  })

  it('comunidad a 2 días → "en 2 días"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-07' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ detalle: 'en 2 días' })
  })

  it('comunidad a 1 día → "mañana"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Junta ordinaria', fecha: '2026-09-06' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ detalle: 'mañana' })
  })

  it('comunidad d=0 sin fecha_fin → "hoy"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Junta ordinaria', fecha: '2026-09-05' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ detalle: 'hoy' })
  })

  it('C13 · comunidad d=0 con fecha_fin posterior → "desde hoy hasta el D de mes"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-05', fecha_fin: '2026-09-22' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ detalle: 'desde hoy hasta el 22 de septiembre' })
  })

  it('C13 · en curso (d<0, hoy < fin) → "hasta el D de mes"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-15', fecha_fin: '2026-09-22' })
    expect(recordatorioCalendario([e], '2026-09-18')).toMatchObject({ detalle: 'hasta el 22 de septiembre' })
  })

  it('C13 · último día (hoy = fin) → "termina hoy"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-15', fecha_fin: '2026-09-22' })
    expect(recordatorioCalendario([e], '2026-09-22')).toMatchObject({ detalle: 'termina hoy' })
  })

  it('C13 · el día siguiente a que termine (hoy > fin) → ya no es candidato → null', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-15', fecha_fin: '2026-09-22' })
    expect(recordatorioCalendario([e], '2026-09-23')).toBeNull()
  })

  it('C11b · comunidad a 7 días (borde de la ventana) → "en 7 días"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-12' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ overline: 'Calendario', detalle: 'en 7 días' })
  })

  it('comunidad a 5 días → "en 5 días"', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Junta ordinaria', fecha: '2026-09-10' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ detalle: 'en 5 días' })
  })

  it('comunidad a 4 días → "en 4 días" (antes quedaba fuera de la ventana)', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-09' })
    expect(recordatorioCalendario([e], '2026-09-05')).toMatchObject({ detalle: 'en 4 días' })
  })

  it('C12 · comunidad a 8 días (d=8) → fuera de la ventana → null', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-13' })
    expect(recordatorioCalendario([e], '2026-09-05')).toBeNull()
  })

  it('C17 · evento movido a +10 días → deja de ser candidato → null', () => {
    const e = mkEvento({ tipo: 'comunidad', titulo: 'Cierre de la piscina', fecha: '2026-09-15' })
    expect(recordatorioCalendario([e], '2026-09-05')).toBeNull()
  })

  it('empate a igual fecha: gana comunidad sobre festivo', () => {
    const comunidad = mkEvento({ tipo: 'comunidad', titulo: 'Junta ordinaria', fecha: '2026-10-12' })
    const festivo = mkEvento({ tipo: 'festivo', titulo: 'Fiesta Nacional de España', fecha: '2026-10-12' })
    const r = recordatorioCalendario([festivo, comunidad], '2026-10-12')
    expect(r?.tipo).toBe('comunidad')
    expect(r?.titulo).toBe('Junta ordinaria')
  })

  it('entre varios candidatos válidos, gana la fecha más próxima', () => {
    const lejos = mkEvento({ tipo: 'comunidad', titulo: 'Lejos', fecha: '2026-09-07' }) // en 2 días
    const cerca = mkEvento({ tipo: 'comunidad', titulo: 'Cerca', fecha: '2026-09-06' }) // mañana
    const r = recordatorioCalendario([lejos, cerca], '2026-09-05')
    expect(r?.titulo).toBe('Cerca')
    expect(r?.detalle).toBe('mañana')
  })

  it('evento sin ningún candidato válido junto a uno que sí lo es → devuelve el único candidato', () => {
    const lejos = mkEvento({ tipo: 'comunidad', titulo: 'Lejos', fecha: '2026-09-20' }) // fuera de ventana
    const cerca = mkEvento({ tipo: 'comunidad', titulo: 'Cerca', fecha: '2026-09-06' })
    const r = recordatorioCalendario([lejos, cerca], '2026-09-05')
    expect(r?.titulo).toBe('Cerca')
  })
})
