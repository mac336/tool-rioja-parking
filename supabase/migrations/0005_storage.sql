-- ============================================================================
-- Rioja 25 · Storage — bucket privado para adjuntos (fotos de incidencias, etc.)
-- Acceso solo por políticas + URLs firmadas de caducidad corta (specs/05, 11).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 8388608,
        array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- storage.objects ya tiene RLS activada por Supabase. Políticas del bucket:
-- lectura: cualquier miembro activo (se sirve con URL firmada).
create policy "adjuntos_read" on storage.objects for select
  using (bucket_id = 'adjuntos' and public.es_activo());

-- subida: miembro activo, y el objeto queda a su nombre (owner = auth.uid()).
create policy "adjuntos_insert" on storage.objects for insert
  with check (bucket_id = 'adjuntos' and public.es_activo() and owner = auth.uid());

-- borrado: el que subió el objeto o app_admin.
create policy "adjuntos_delete" on storage.objects for delete
  using (bucket_id = 'adjuntos' and (owner = auth.uid() or public.es_app_admin()));
