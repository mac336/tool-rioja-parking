-- 0034 · Endurecer RLS de publicaciones y likes (auditoría 2026-07-11)
-- 1) El tester vuelve a ser SOLO lectura también en mensajes/mensaje_likes
--    (las políticas de 0031/0033 no seguían el patrón `not es_tester()` de 0022).
-- 2) El autor NO puede borrar su publicación ya PUBLICADA en el tablón; solo
--    sus borradores/pendientes/rechazados o sus reportes privados a administración
--    (0031 dejaba borrar cualquier fila propia, likes incluidos por cascade).
-- 3) El "me gusta" es de la VIVIENDA: cualquiera de sus cuentas (máx. 2) puede
--    quitarlo, no solo quien lo emitió — coherente con `yo_like` por vivienda
--    y con la PK (mensaje_id, vivienda).
-- 4) Quien puede moderar (aprobar_incidencias/aprobar_anuncios) ve la cola de
--    moderación aunque su rol no tenga el permiso `panel` (es_gestion).

-- LEER: publicado+todos para activos; el autor lo suyo; gestión Y moderadores todo.
drop policy if exists msg_sel on mensajes;
create policy msg_sel on mensajes for select using (
  es_activo() and (
    (estado = 'publicado' and destino = 'todos' and activo)
    or created_by = auth.uid()
    or es_gestion()
    or puede_moderar_publicaciones()
  )
);

-- CREAR: igual que 0033 + `not es_tester()`.
drop policy if exists msg_ins on mensajes;
create policy msg_ins on mensajes for insert with check (
  es_activo() and not es_tester() and created_by = auth.uid() and (
    tiene_permiso('publicar_mensajes')
    or (tipo in ('incidencia', 'anuncio', 'sugerencia') and (
         (destino = 'todos' and estado in ('borrador', 'pendiente'))
      or (destino = 'administracion' and estado = 'publicado')
    ))
  )
);

-- EDITAR: moderadores; el autor (no tester) solo sus borradores/pendientes
-- (el WITH CHECK impide que el autor se auto-apruebe cambiando el estado).
drop policy if exists msg_upd on mensajes;
create policy msg_upd on mensajes for update using (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and not es_tester() and estado in ('borrador', 'pendiente'))
) with check (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and not es_tester() and estado in ('borrador', 'pendiente'))
);

-- BORRAR: moderadores; el autor (no tester) solo lo NO publicado en el tablón.
drop policy if exists msg_del on mensajes;
create policy msg_del on mensajes for delete using (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and not es_tester()
      and (estado in ('borrador', 'pendiente', 'rechazado') or destino = 'administracion'))
);

-- LIKE: igual que 0033 + `not es_tester()`.
drop policy if exists like_ins on mensaje_likes;
create policy like_ins on mensaje_likes for insert with check (
  es_activo() and not es_tester() and emitido_por = auth.uid() and vivienda = mi_vivienda()
  and exists (select 1 from viviendas v where v.codigo = mi_vivienda() and v.es_piso)
  and exists (select 1 from mensajes m where m.id = mensaje_id
               and m.tipo = 'sugerencia' and m.estado = 'publicado' and m.destino = 'todos')
);

-- QUITAR LIKE: cualquiera de las cuentas de la vivienda (no solo el emisor).
drop policy if exists like_del on mensaje_likes;
create policy like_del on mensaje_likes for delete using (
  es_activo() and not es_tester() and vivienda = mi_vivienda()
);
