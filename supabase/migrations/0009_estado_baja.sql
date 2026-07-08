-- 0009 · Baja de vecinos (reversible)
-- "Dar de baja" a un vecino que ya no vive en la comunidad: no puede acceder,
-- desaparece del directorio y libera la plaza de su vivienda, pero se conserva su
-- historial (incidencias, reservas, votos). Es reversible: la gestión puede
-- reactivarlo ('activo'). Distinto de 'suspendido' (sanción temporal).
alter type user_estado add value if not exists 'baja' after 'suspendido';

-- La regla "máx. 2 cuentas por vivienda" ya solo cuenta activo/pendiente
-- (check_cuentas_por_vivienda, 0002), así que una baja libera la plaza sin
-- cambios adicionales. El directorio ya filtra estado='activo'.
