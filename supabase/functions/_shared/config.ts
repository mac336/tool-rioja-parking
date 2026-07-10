// Interruptor global de correos de NOTIFICACIÓN.
// Puesto en `false`: la app NO envía correos de aviso (nuevas solicitudes,
// aprobación/rechazo de reservas, sugerencias). Esos avisos van por push.
// NO afecta a los correos imprescindibles, que van por otras vías:
//   - Código de acceso (login OTP): lo gestiona Supabase Auth.
//   - Invitación al aprobar un alta: Edge Function `aprobar-solicitud`.
// Para reactivar los correos de notificación, poner `true` y redesplegar.
export const CORREOS_NOTIFICACION = false
