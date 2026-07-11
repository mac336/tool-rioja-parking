-- 0033 · "Me gusta" de sugerencias (1 por vivienda) + permitir publicar sugerencias
-- El vecino puede enviar 'sugerencia' igual que incidencia/anuncio (moderada).
drop policy if exists msg_ins on mensajes;
create policy msg_ins on mensajes for insert with check (
  es_activo() and created_by = auth.uid() and (
    tiene_permiso('publicar_mensajes')
    or (tipo in ('incidencia', 'anuncio', 'sugerencia') and (
         (destino = 'todos' and estado in ('borrador', 'pendiente'))
      or (destino = 'administracion' and estado = 'publicado')
    ))
  )
);

-- Likes: una vivienda (piso) da un único "me gusta" a una sugerencia publicada.
create table if not exists mensaje_likes (
  mensaje_id  uuid not null references mensajes(id) on delete cascade,
  vivienda    text not null,
  emitido_por uuid not null default auth.uid(),
  created_at  timestamptz not null default now(),
  primary key (mensaje_id, vivienda)
);
alter table mensaje_likes enable row level security;
grant select, insert, delete on mensaje_likes to authenticated;

-- Ver los likes: cualquier vecino activo (para contar y saber si ya di el mío).
drop policy if exists like_sel on mensaje_likes;
create policy like_sel on mensaje_likes for select using (es_activo());

-- Dar like: activo, a nombre de MI vivienda (piso real), sobre una sugerencia
-- publicada para todos.
drop policy if exists like_ins on mensaje_likes;
create policy like_ins on mensaje_likes for insert with check (
  es_activo() and emitido_por = auth.uid() and vivienda = mi_vivienda()
  and exists (select 1 from viviendas v where v.codigo = mi_vivienda() and v.es_piso)
  and exists (select 1 from mensajes m where m.id = mensaje_id
               and m.tipo = 'sugerencia' and m.estado = 'publicado' and m.destino = 'todos')
);

-- Quitar el like de mi vivienda.
drop policy if exists like_del on mensaje_likes;
create policy like_del on mensaje_likes for delete using (
  vivienda = mi_vivienda() and emitido_por = auth.uid()
);
