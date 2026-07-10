-- Buzón: permitir BORRAR un hilo (conversación) a quien puede verlo — el vecino
-- dueño o el rol del canal (incluye app_admin en su canal). Al borrar el hilo,
-- sus mensajes caen en cascada (FK hilo_mensajes.hilo_id ON DELETE CASCADE).
-- Mantiene el mismo criterio que SELECT/UPDATE (ver 0017).
create policy hilo_del on hilos for delete
  using ((vecino_id = auth.uid()) or puede_ver_hilo(canal));
