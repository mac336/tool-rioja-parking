-- 0061 · El borrado de fotos pasa por la Storage API (arregla un borrado ROTO)
-- ---------------------------------------------------------------------------
-- La 0036 limpiaba el fichero con un trigger que hacía `delete from
-- storage.objects`. Supabase ha añadido después una protección
-- (`protect_objects_delete`) que PROHÍBE borrar de esas tablas por SQL:
--   ERROR 42501: Direct deletion from storage tables is not allowed.
-- Como el trigger lanza excepción, tumbaba la transacción entera: desde entonces
-- NINGÚN mensaje con fotos se podía borrar (fallaba en silencio en la app).
-- Y salta aunque el objeto ya no exista, porque la protección es de sentencia.
--
-- Se retira el trigger; la limpieza la hace ahora el cliente con la Storage API
-- (`storage.from('adjuntos').remove(...)` en borrarMensaje), que es lo único que
-- libera de verdad el espacio, no solo la fila de metadatos.
drop trigger if exists trg_borrar_adjunto on mensaje_adjuntos;
drop function if exists borrar_adjunto_storage();

-- El permiso de borrado del bucket se alinea con quien puede borrar el MENSAJE
-- (política msg_del): si no, un presidente borraba la incidencia de un vecino y
-- las fotos se quedaban huérfanas ocupando espacio para siempre.
drop policy if exists adjuntos_delete on storage.objects;
create policy adjuntos_delete on storage.objects for delete
  using (
    bucket_id = 'adjuntos'
    and (owner = auth.uid() or es_app_admin() or puede_moderar_publicaciones())
  );
