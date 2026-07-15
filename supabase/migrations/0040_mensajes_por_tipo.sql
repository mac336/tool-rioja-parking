-- 0040 · Tablón por tipo (Fase 3)
-- ---------------------------------------------------------------------------
-- La visibilidad y la publicación/edición del tablón pasan a ser POR TIPO de
-- mensaje (permisos ver_<tipo> / publicar_<tipo>, creados en 0038). Se retira el
-- permiso único 'publicar_mensajes'. La cola de vecinos (propuestas con
-- moderación) y los reportes privados a administración no cambian.

-- LEER: un mensaje publicado a todos se ve solo si el rol puede VER ese tipo.
-- El autor ve lo suyo; la gestión y los moderadores lo ven todo.
drop policy if exists msg_sel on mensajes;
create policy msg_sel on mensajes for select using (
  es_activo() and (
    (estado = 'publicado' and destino = 'todos' and activo and puede_ver_tipo(tipo::text))
    or created_by = auth.uid()
    or es_gestion()
    or puede_moderar_publicaciones()
  )
);

-- CREAR: publicar directo requiere el permiso de publicar ESE tipo; se mantiene
-- la vía de propuesta del vecino (incidencia/anuncio/sugerencia en borrador/
-- pendiente, o reporte privado a administración).
drop policy if exists msg_ins on mensajes;
create policy msg_ins on mensajes for insert with check (
  es_activo() and not es_tester() and created_by = auth.uid() and (
    puede_publicar_tipo(tipo::text)
    or (tipo in ('incidencia', 'anuncio', 'sugerencia') and (
         (destino = 'todos' and estado in ('borrador', 'pendiente'))
      or (destino = 'administracion' and estado = 'publicado')
    ))
  )
);

-- EDITAR: moderadores; quien puede publicar ese tipo; o el autor sus borradores.
drop policy if exists msg_upd on mensajes;
create policy msg_upd on mensajes for update using (
  puede_moderar_publicaciones()
  or puede_publicar_tipo(tipo::text)
  or (created_by = auth.uid() and not es_tester() and estado = 'borrador')
) with check (
  puede_moderar_publicaciones()
  or puede_publicar_tipo(tipo::text)
  or (created_by = auth.uid() and not es_tester() and estado in ('borrador', 'pendiente'))
);

-- BORRAR: moderadores; quien puede publicar ese tipo; o el autor lo NO publicado.
drop policy if exists msg_del on mensajes;
create policy msg_del on mensajes for delete using (
  puede_moderar_publicaciones()
  or puede_publicar_tipo(tipo::text)
  or (created_by = auth.uid() and not es_tester()
      and (estado in ('borrador', 'pendiente', 'rechazado') or destino = 'administracion'))
);

-- Retirar el permiso legacy 'publicar_mensajes' (sustituido por publicar_<tipo>).
delete from role_permissions where permiso = 'publicar_mensajes';
