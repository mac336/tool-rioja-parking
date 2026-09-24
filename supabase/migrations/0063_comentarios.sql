-- 0063 · Comentarios en las tarjetas del tablón (estilo «respuesta»)
-- ---------------------------------------------------------------------------
-- El vecino responde a una incidencia, un anuncio o una sugerencia desde el
-- visor. NO se comentan los AVISOS: son comunicados de la administración y no
-- queremos convertir un corte de agua en un hilo de quejas (decisión del
-- usuario). Autor siempre visible: nada anónimo, igual que con las firmas (0062).
--
-- Publicación DIRECTA (si pasara por aprobación no habría conversación); a
-- cambio, la gestión puede borrar cualquiera y el vecino puede REPORTAR uno.
-- Los comentarios mueren con su tarjeta (cascade): al borrarla se van con ella.

create table if not exists mensaje_comentarios (
  id         uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null references mensajes(id) on delete cascade,
  cuerpo     text not null check (char_length(cuerpo) between 1 and 1000),
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_com_mensaje on mensaje_comentarios(mensaje_id, created_at);

-- Reportes: 1 por persona y comentario. Solo marcan; no ocultan nada solos.
create table if not exists comentario_reportes (
  comentario_id uuid not null references mensaje_comentarios(id) on delete cascade,
  reportado_por uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (comentario_id, reportado_por)
);

alter table mensaje_comentarios enable row level security;
alter table comentario_reportes enable row level security;

-- Privilegios EXPLÍCITOS (los default privileges no coinciden entre entornos:
-- ver specs/10 § Keep-alive; regla general del proyecto desde la 0055).
revoke all on mensaje_comentarios from anon, authenticated;
revoke all on comentario_reportes from anon, authenticated;
grant select, insert, delete on mensaje_comentarios to authenticated;
grant select, insert, delete on comentario_reportes to authenticated;
grant all on mensaje_comentarios to service_role;
grant all on comentario_reportes to service_role;

-- Permiso de rol (convención del proyecto: toda función tiene el suyo).
insert into role_permissions (rol, permiso) values
  ('presidente','comentar'), ('vicepresidente','comentar'),
  ('administrador_finca','comentar'), ('junta','comentar'),
  ('conserje','comentar'), ('vecino','comentar'), ('inquilino','comentar')
on conflict do nothing;

-- ---- Comentarios: RLS ------------------------------------------------------
-- VER: se ve el comentario si se ve su mensaje (mismo criterio que las fotos).
drop policy if exists com_sel on mensaje_comentarios;
create policy com_sel on mensaje_comentarios for select using (
  es_activo() and exists (
    select 1 from mensajes m where m.id = mensaje_id and (
      (m.estado = 'publicado' and m.destino = 'todos' and m.activo)
      or m.created_by = auth.uid()
      or es_gestion()
      or puede_moderar_publicaciones()
    )
  )
);

-- ESCRIBIR: activo, con permiso, nunca el tester, en MI nombre y solo sobre una
-- tarjeta PUBLICADA para todos de los tres tipos que admiten conversación.
drop policy if exists com_ins on mensaje_comentarios;
create policy com_ins on mensaje_comentarios for insert with check (
  es_activo() and not es_tester() and tiene_permiso('comentar')
  and created_by = auth.uid()
  and exists (
    select 1 from mensajes m where m.id = mensaje_id
      and m.estado = 'publicado' and m.destino = 'todos' and m.activo
      and m.tipo in ('incidencia', 'anuncio', 'sugerencia')
  )
);

-- BORRAR: el autor del comentario, o quien modera/gestiona.
drop policy if exists com_del on mensaje_comentarios;
create policy com_del on mensaje_comentarios for delete using (
  created_by = auth.uid() or es_gestion() or puede_moderar_publicaciones()
);

-- ---- Reportes: RLS ---------------------------------------------------------
-- Quien reporta ve lo suyo; la gestión los ve todos (para atender la cola).
drop policy if exists rep_sel on comentario_reportes;
create policy rep_sel on comentario_reportes for select using (
  es_activo() and (reportado_por = auth.uid() or es_gestion() or puede_moderar_publicaciones())
);
drop policy if exists rep_ins on comentario_reportes;
create policy rep_ins on comentario_reportes for insert with check (
  es_activo() and not es_tester() and reportado_por = auth.uid()
);
drop policy if exists rep_del on comentario_reportes;
create policy rep_del on comentario_reportes for delete using (
  reportado_por = auth.uid() or es_gestion() or puede_moderar_publicaciones()
);
