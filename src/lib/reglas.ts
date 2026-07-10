// Reglas de negocio compartidas por varias pantallas (lado cliente).
// La garantía REAL vive en la base de datos (triggers/RLS); esto solo adapta
// la interfaz (mostrar u ocultar acciones) al mismo criterio.

/** Antelación mínima (horas) para que un vecino anule su reserva. */
export const HORAS_MIN_ANULACION = 24

/** ¿Puede el vecino anular una reserva que empieza en `inicioIso`?
 *  Solo hasta 24 h antes del inicio (trigger reservas_anulacion_24h, mig. 0020). */
export function puedeAnularReserva(inicioIso: string, ahora = new Date()): boolean {
  return new Date(inicioIso).getTime() - ahora.getTime() >= HORAS_MIN_ANULACION * 3_600_000
}

/** ¿La reserva ya se celebró? (aprobada y terminada → queda archivada). */
export function reservaCelebrada(estado: string, finIso: string, ahora = new Date()): boolean {
  return estado === 'aprobada' && new Date(finIso).getTime() < ahora.getTime()
}
