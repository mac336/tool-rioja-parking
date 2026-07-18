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

/** ¿Sigue vigente la decoración base por fecha? */
export function festivoPorFecha(): boolean {
  return Date.now() < FESTIVO_HASTA
}

/** ¿Se muestra la decoración festiva? Con "campeones" activo se muestra siempre;
 *  si no, solo hasta la fecha de corte. */
export function modoFestivo(campeones: boolean): boolean {
  return campeones || festivoPorFecha()
}

/** Título y subtítulo del banner/splash según el modo. */
export function textoFestivo(campeones: boolean): { titulo: string; subtitulo?: string } {
  return campeones
    ? { titulo: '¡ESPAÑA CAMPEONES 2026!' }
    : { titulo: '¡Vamos España!', subtitulo: 'Final del Mundial · mañana 21:00' }
}
