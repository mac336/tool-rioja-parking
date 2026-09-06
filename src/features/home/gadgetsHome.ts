// Lógica pura del bloque de "gadgets contextuales" de la Home (specs/21 §
// Recordatorio en la Home): qué tarjetas caben en el cupo y qué dice el
// recordatorio de calendario. Sin React ni llamadas a red: se testea aparte
// (tests/calendario.test.ts) y lo consumen HomePage.tsx / GadgetContextual.tsx.
import type { EventoCalendario, TipoEvento } from '@/types'

export type ClaveGadget = 'parking' | 'reserva' | 'calendario'

export interface CandidatoGadget<T = unknown> {
  clave: ClaveGadget
  prioridad: number
  datos: T
}

/** Filtra nulos/undefined, ordena por prioridad ascendente (estable) y corta al cupo. */
export function seleccionarGadgets<T>(
  candidatos: Array<CandidatoGadget<T> | null | undefined>,
  cupo = 2,
): CandidatoGadget<T>[] {
  return candidatos
    .filter((c): c is CandidatoGadget<T> => c != null)
    .sort((a, b) => a.prioridad - b.prioridad) // Array#sort es estable (ES2019+)
    .slice(0, cupo)
}

function parseYMD(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split('-').map(Number)
  return { y, m, d }
}

/** Días naturales entre dos 'YYYY-MM-DD' (hasta - desde), sin DST (Date.UTC). */
export function diasEntre(desde: string, hasta: string): number {
  const a = parseYMD(desde)
  const b = parseYMD(hasta)
  const msA = Date.UTC(a.y, a.m - 1, a.d)
  const msB = Date.UTC(b.y, b.m - 1, b.d)
  return Math.round((msB - msA) / 86_400_000)
}

/** '2026-09-22' → '22 de septiembre' (Intl es-ES, timeZone UTC sobre Date.UTC). */
export function textoDia(ymd: string): string {
  const { y, m, d } = parseYMD(ymd)
  const fecha = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(fecha)
}

/** pasado = coalesce(fecha_fin, fecha) < hoy (comparación de claves 'YYYY-MM-DD'). */
export function esPasado(e: { fecha: string; fecha_fin: string | null }, hoy: string): boolean {
  const fin = e.fecha_fin ?? e.fecha
  return fin < hoy
}

export interface ParticionEventos<T> {
  proximos: T[]
  pasados: T[]
}

/** Reparte `eventos` entre "próximos" y "pasados" para la pantalla
 *  /calendario (specs/21 § Ciclo de vida y relaciones, decisión del usuario
 *  2026-09-06): un festivo que ya pasó se borra solo en el servidor
 *  (`purgar_festivos_pasados()`, cron diario a las 03:25), pero esta
 *  partición defiende la vista aunque el cron aún no haya corrido —
 *  ningún festivo pasado se muestra JAMÁS, ni en "Próximos" ni en
 *  "Pasados". Los eventos de comunidad pasados SÍ se conservan como
 *  histórico en "Pasados". */
export function particionarEventos<T extends { fecha: string; fecha_fin: string | null; tipo: TipoEvento }>(
  eventos: T[],
  hoy: string,
): ParticionEventos<T> {
  const proximos: T[] = []
  const pasados: T[] = []
  for (const e of eventos) {
    if (!esPasado(e, hoy)) proximos.push(e)
    else if (e.tipo === 'comunidad') pasados.push(e)
    // festivo pasado: se descarta, no aparece en ninguna sección.
  }
  return { proximos, pasados }
}

export interface RecordatorioCalendario {
  tipo: TipoEvento
  titulo: string
  overline: 'Calendario' | 'Festivo'
  detalle: string | null
  evento: EventoCalendario
}

interface Candidato {
  evento: EventoCalendario
  tipo: TipoEvento
  titulo: string
  overline: 'Calendario' | 'Festivo'
  detalle: string | null
  fecha: string
}

// Ventana y textos de la tabla de specs/21 § Recordatorio en la Home.
function candidatoDe(e: EventoCalendario, hoy: string): Candidato | null {
  if (e.tipo === 'festivo') {
    if (e.fecha !== hoy) return null // festivo: SOLO el día, ni antes ni después
    return { evento: e, tipo: 'festivo', titulo: e.titulo, overline: 'Festivo', detalle: null, fecha: e.fecha }
  }
  // comunidad: hoy ∈ [fecha − 3 días, coalesce(fecha_fin, fecha)]
  const fin = e.fecha_fin ?? e.fecha
  const d = diasEntre(hoy, e.fecha) // días desde hoy hasta fecha (fecha - hoy)
  if (d > 3 || hoy > fin) return null
  let detalle: string
  if (d === 3) detalle = 'en 3 días'
  else if (d === 2) detalle = 'en 2 días'
  else if (d === 1) detalle = 'mañana'
  else if (d === 0 && fin === e.fecha) detalle = 'hoy'
  else if (d === 0 && fin > e.fecha) detalle = `desde hoy hasta el ${textoDia(fin)}`
  else if (d < 0 && hoy < fin) detalle = `hasta el ${textoDia(fin)}`
  else if (d < 0 && hoy === fin) detalle = 'termina hoy'
  else return null
  return { evento: e, tipo: 'comunidad', titulo: e.titulo, overline: 'Calendario', detalle, fecha: e.fecha }
}

/** Recordatorio a mostrar en la Home (o null si ningún evento aplica hoy).
 *  Entre varios candidatos: gana `fecha` más próxima; a igual fecha, comunidad
 *  antes que festivo; luego título. */
export function recordatorioCalendario(
  eventos: EventoCalendario[] | null | undefined,
  hoy: string,
): RecordatorioCalendario | null {
  if (!eventos || eventos.length === 0) return null
  const candidatos = eventos
    .map((e) => candidatoDe(e, hoy))
    .filter((c): c is Candidato => c !== null)
  if (candidatos.length === 0) return null
  candidatos.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
    if (a.tipo !== b.tipo) return a.tipo === 'comunidad' ? -1 : 1
    return a.titulo.localeCompare(b.titulo, 'es')
  })
  const g = candidatos[0]
  return { tipo: g.tipo, titulo: g.titulo, overline: g.overline, detalle: g.detalle, evento: g.evento }
}
