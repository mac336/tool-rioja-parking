// Modo festivo temporal "¡Vamos España!" (final del Mundial).
// ---------------------------------------------------------------------------
// Decoración temporal: confeti, banderines y banner en Home y splash. Se muestra
// automáticamente hasta la fecha de corte (fin del día de la final). El
// app_admin puede activar el modo "CAMPEONES" (flag app_config.festivo_campeones),
// que cambia el texto y mantiene la decoración aunque haya pasado la fecha.

// Colores de España (decorativos, NO tokens globales).
export const ROJO_ES = '#D6392B'
export const AMARILLO_ES = '#F5B417'

// La decoración base se muestra hasta esta fecha/hora (Europe/Madrid, CEST +02:00):
// el día de la final (19-07-2026) a las 23:00.
export const FESTIVO_HASTA = new Date('2026-07-19T23:00:00+02:00').getTime()

// Hora del pitido inicial de la final (Europe/Madrid). La cuenta atrás va a esto.
export const FINAL_MUNDIAL_MS = new Date('2026-07-19T21:00:00+02:00').getTime()

// Modo "campeones": aunque el app_admin lo deje encendido, se apaga solo al
// acabar el LUNES (martes 21-07 a las 00:00, Europe/Madrid). El martes desaparece.
export const CAMPEONES_HASTA = new Date('2026-07-21T00:00:00+02:00').getTime()

/** ¿Sigue vigente la decoración base por fecha? */
export function festivoPorFecha(): boolean {
  return Date.now() < FESTIVO_HASTA
}

/** ¿Se muestra la decoración festiva? La base va hasta FESTIVO_HASTA; con
 *  "campeones" activo se mantiene, pero solo hasta CAMPEONES_HASTA (fin del lunes:
 *  el martes desaparece aunque el interruptor siga encendido). */
export function modoFestivo(campeones: boolean): boolean {
  return festivoPorFecha() || (campeones && Date.now() < CAMPEONES_HASTA)
}

/** Título del banner/splash según el modo. El subtítulo (cuenta atrás) se calcula
 *  aparte y en vivo (ver useCuentaAtras). */
export function textoFestivo(campeones: boolean): { titulo: string } {
  return campeones ? { titulo: '¡ESPAÑA CAMPEONES 2026!' } : { titulo: '¡Vamos España!' }
}
