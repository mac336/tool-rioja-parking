-- 0031 · Publicaciones de vecinos (incidencias/anuncios) con moderación
-- Los vecinos pueden ENVIAR incidencias y anuncios desde el buzón. Se guardan en
-- `mensajes` con un ESTADO y un DESTINO:
--   estado:  borrador | pendiente | publicado | rechazado
--   destino: todos (tablón, requiere aprobación) | administracion (privado)
-- La gestión (publicar_mensajes) sigue publicando directamente (estado=publicado).

do $$ begin
  if not exists (select 1 from pg_type where typname = 'mensaje_estado') then
    create type mensaje_estado as enum ('borrador', 'pendiente', 'publicado', 'rechazado');
  end if;
  if not exists (select 1 from pg_type where typname = 'mensaje_destino') then
    create type mensaje_destino as enum ('todos', 'administracion');
  end if;
end $$;

alter table mensajes add column if not exists estado  mensaje_estado  not null default 'publicado';
alter table mensajes add column if not exists destino mensaje_destino not null default 'todos';
alter table mensajes add column if not exists publica_at timestamptz not null default now();

-- Semilla de aprobar_anuncios (por si faltaba) — aprobar_incidencias ya existe.
insert into role_permissions (rol, permiso) values
  ('app_admin','aprobar_anuncios'),('presidente','aprobar_anuncios'),('vicepresidente','aprobar_anuncios'),
  ('administrador_finca','aprobar_anuncios'),('junta','aprobar_anuncios')
on conflict do nothing;

create or replace function puede_moderar_publicaciones() returns boolean
  language sql stable security definer set search_path = public as $$
  select tiene_permiso('aprobar_incidencias')
      or tiene_permiso('aprobar_anuncios')
      or tiene_permiso('publicar_mensajes');
$$;

-- ---- RLS -------------------------------------------------------------------
-- LEER: todos ven lo publicado para todos y vigente; el autor ve lo suyo; la
-- gestión ve todo (cola de moderación + reportes a administración).
drop policy if exists msg_sel on mensajes;
create policy msg_sel on mensajes for select using (
  es_activo() and (
    (estado = 'publicado' and destino = 'todos' and activo)
    or created_by = auth.uid()
    or es_gestion()
  )
);

-- CREAR: la gestión publica directo; el vecino solo incidencias/anuncios como
-- borrador/pendiente (para todos) o como reporte publicado (a administración).
drop policy if exists msg_ins on mensajes;
create policy msg_ins on mensajes for insert with check (
  es_activo() and created_by = auth.uid() and (
    tiene_permiso('publicar_mensajes')
    or (tipo in ('incidencia', 'anuncio') and (
         (destino = 'todos' and estado in ('borrador', 'pendiente'))
      or (destino = 'administracion' and estado = 'publicado')
    ))
  )
);

-- EDITAR: moderadores (aprobar/rechazar/editar); el autor solo sus borradores/pendientes.
drop policy if exists msg_upd on mensajes;
create policy msg_upd on mensajes for update using (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and estado in ('borrador', 'pendiente'))
) with check (
  puede_moderar_publicaciones()
  or (created_by = auth.uid() and estado in ('borrador', 'pendiente'))
);

-- BORRAR: moderadores o el propio autor (su borrador/pendiente/reporte).
drop policy if exists msg_del on mensajes;
create policy msg_del on mensajes for delete using (
  puede_moderar_publicaciones() or created_by = auth.uid()
);
