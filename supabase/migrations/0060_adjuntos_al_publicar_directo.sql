-- 0060 · Fotos también al publicar DIRECTO (Gestión → Mensajes)
-- Hasta ahora `adj_ins` solo dejaba adjuntar al moderador, o al autor mientras su
-- mensaje seguía sin publicar (borrador/pendiente) o era reporte privado. Quien
-- publica directo crea el mensaje ya en estado 'publicado', así que no encajaba en
-- ninguna rama y sus fotos se quedaban fuera (la inserción fallaba por RLS).
-- Se añade la rama que faltaba: el AUTOR de un mensaje que tiene el permiso
-- `publicar_<tipo>` puede adjuntarle fotos. Sigue sin poder tocar las de otros.
drop policy if exists adj_ins on mensaje_adjuntos;
create policy adj_ins on mensaje_adjuntos for insert with check (
  es_activo() and not es_tester() and created_by = auth.uid() and exists (
    select 1 from mensajes m where m.id = mensaje_id and (
      puede_moderar_publicaciones()
      or (m.created_by = auth.uid()
          and (m.estado in ('borrador', 'pendiente') or m.destino = 'administracion'))
      or (m.created_by = auth.uid() and tiene_permiso('publicar_' || m.tipo::text))
    )
  )
);
