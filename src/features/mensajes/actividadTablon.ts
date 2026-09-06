// Filtro de "Actividad reciente" del tablón de la HOME (solo Inicio; specs/16).
// Extraído de HomePage.tsx para poder testearlo sin montar la pantalla y para
// que quede claro que NO es el mismo filtro que usa Servicios → Sugerencias
// (SugerenciasPage.tsx lista TODAS las sugerencias, sin límite de antigüedad;
// tiene su propio filtro por tipo, no importa nada de aquí).
import type { Mensaje } from '@/types'

const DIA_MS = 864e5
export const DOS_DIAS_MS = 2 * DIA_MS

// Petición del usuario (2026-09-06): pasado "más de 1 mes" la sugerencia deja de
// verse en el tablón principal de Inicio, pero sigue visible y votable en
// Servicios → Sugerencias. "1 mes" = 30 DÍAS NATURALES (no mes de calendario),
// contados desde la fecha de ACTIVIDAD (created_at o, si es más tarde, la
// última edición): si el vecino edita su sugerencia pasado ese plazo, vuelve a
// contar como reciente y "resucita" en el tablón de Inicio.
export const DIAS_SUGERENCIA_EN_TABLON = 30
const MS_SUGERENCIA_EN_TABLON = DIAS_SUGERENCIA_EN_TABLON * DIA_MS

/** Fecha de actividad = la más reciente entre creación y edición (mig. 0042):
 *  al editar un mensaje "resucita" en el tablón de Inicio. */
export function fechaActividad(m: Pick<Mensaje, 'created_at' | 'updated_at'>): number {
  return Math.max(new Date(m.created_at).getTime(), m.updated_at ? new Date(m.updated_at).getTime() : 0)
}

/** ¿Cuenta este mensaje como "actividad reciente" del tablón de Inicio?
 *  - incidencia: SIEMPRE (sin cambios).
 *  - sugerencia: solo mientras esté dentro de `DIAS_SUGERENCIA_EN_TABLON` desde
 *    su fecha de actividad; pasado ese plazo se oculta AQUÍ (sigue en
 *    Servicios → Sugerencias, con sus votos).
 *  - aviso/anuncio: con `expira_at` → hasta que caduca; sin caducidad → solo
 *    mientras son recientes (2 días).
 *  - resto: recientes (2 días). */
export function esActividadDeTablon(m: Mensaje, ahora: number): boolean {
  if (m.tipo === 'incidencia') return true
  if (m.tipo === 'sugerencia') return ahora - fechaActividad(m) <= MS_SUGERENCIA_EN_TABLON

  const reciente = ahora - fechaActividad(m) <= DOS_DIAS_MS
  if (m.tipo === 'aviso' || m.tipo === 'anuncio') {
    return m.expira_at ? new Date(m.expira_at).getTime() >= ahora : reciente
  }
  return reciente
}
