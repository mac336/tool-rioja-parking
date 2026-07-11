-- 0035 · Una publicación ENVIADA a aprobar ya no la edita el autor
-- Antes (0034) el autor podía editar mientras estuviera en 'borrador' O 'pendiente'.
-- Decisión: una vez enviada a aprobación (pendiente), queda congelada para el
-- autor; solo la tocan los moderadores. El autor solo edita sus BORRADORES.
-- (Sigue pudiendo BORRARla para retirarla — msg_del no cambia.)
drop policy if exists msg_upd on mensajes;
create policy msg_upd on mensajes for update using (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and not es_tester() and estado = 'borrador')
) with check (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and not es_tester() and estado in ('borrador', 'pendiente'))
);
