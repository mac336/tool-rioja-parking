-- 0036 · Fotos en las publicaciones (incidencias): bucket + tabla + RLS + limpieza
-- Recrea el bucket privado `adjuntos` (se retiró en 0013 con el sistema viejo) y
-- añade `mensaje_adjuntos` (1..2 fotos por mensaje). Las imágenes se sirven con
-- URL firmada de caducidad corta; la visibilidad de la foto sigue a la del mensaje.

-- ---- Bucket privado ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 3145728,  -- 3 MB de tope duro
        array['image/webp','image/jpeg','image/png'])
on conflict (id) do update
  set public = false, file_size_limit = 3145728,
      allowed_mime_types = array['image/webp','image/jpeg','image/png'];

-- Políticas del bucket (storage.objects ya tiene RLS por Supabase).
drop policy if exists adjuntos_read on storage.objects;
create policy adjuntos_read on storage.objects for select
  using (bucket_id = 'adjuntos' and public.es_activo());

drop policy if exists adjuntos_insert on storage.objects;
create policy adjuntos_insert on storage.objects for insert
  with check (bucket_id = 'adjuntos' and public.es_activo() and not public.es_tester() and owner = auth.uid());

drop policy if exists adjuntos_delete on storage.objects;
create policy adjuntos_delete on storage.objects for delete
  using (bucket_id = 'adjuntos' and (owner = auth.uid() or public.es_app_admin()));

-- ---- Tabla de adjuntos ------------------------------------------------------
create table if not exists mensaje_adjuntos (
  id         uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null references mensajes(id) on delete cascade,
  path       text not null,               -- ruta en el bucket: {mensaje_id}/{orden}.webp
  orden      smallint not null default 0, -- 0..1 (máx. 2 por mensaje)
  created_by uuid not null default auth.uid() references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mensaje_id, orden)
);
create index if not exists idx_adj_mensaje on mensaje_adjuntos(mensaje_id);

grant select, insert, delete on mensaje_adjuntos to authenticated;
alter table mensaje_adjuntos enable row level security;

-- LEER: la foto se ve si se ve el mensaje (mismo criterio que msg_sel + moderador).
drop policy if exists adj_sel on mensaje_adjuntos;
create policy adj_sel on mensaje_adjuntos for select using (
  es_activo() and exists (
    select 1 from mensajes m where m.id = mensaje_id and (
      (m.estado = 'publicado' and m.destino = 'todos' and m.activo)
      or m.created_by = auth.uid()
      or es_gestion()
      or puede_moderar_publicaciones()
    )
  )
);

-- CREAR: el autor mientras su mensaje está sin publicar (o es reporte privado),
-- o un moderador. Nunca el tester.
drop policy if exists adj_ins on mensaje_adjuntos;
create policy adj_ins on mensaje_adjuntos for insert with check (
  es_activo() and not es_tester() and created_by = auth.uid() and exists (
    select 1 from mensajes m where m.id = mensaje_id and (
      puede_moderar_publicaciones()
      or (m.created_by = auth.uid()
          and (m.estado in ('borrador', 'pendiente') or m.destino = 'administracion'))
    )
  )
);

-- BORRAR: el autor de la foto o un moderador (el cascade cubre el borrado del mensaje).
drop policy if exists adj_del on mensaje_adjuntos;
create policy adj_del on mensaje_adjuntos for delete using (
  puede_moderar_publicaciones() or created_by = auth.uid()
);

-- ---- Limpieza en cascada del objeto de Storage ------------------------------
-- Al borrar la fila (incl. cascade al borrar el mensaje) se borra el fichero.
create or replace function borrar_adjunto_storage() returns trigger
  language plpgsql security definer set search_path = public, storage as $$
begin
  delete from storage.objects where bucket_id = 'adjuntos' and name = old.path;
  return old;
end $$;

drop trigger if exists trg_borrar_adjunto on mensaje_adjuntos;
create trigger trg_borrar_adjunto after delete on mensaje_adjuntos
  for each row execute function borrar_adjunto_storage();
