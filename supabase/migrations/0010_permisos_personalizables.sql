-- 0010 · Permisos personalizables por rol (app_admin = SUPERADMIN)
-- Hasta ahora los permisos estaban fijos en los helpers RLS (0002). Ahora viven
-- en una tabla que el app_admin puede editar; los helpers la consultan en vivo.
-- app_admin SIEMPRE tiene todos los permisos (no editable). El resto de roles se
-- configuran. Se siembra con los valores ACTUALES → sin cambio de comportamiento.

create table if not exists role_permissions (
  rol     user_role not null,
  permiso text      not null,
  primary key (rol, permiso)
);

alter table role_permissions enable row level security;
grant select on role_permissions to authenticated, anon;
grant insert, delete on role_permissions to authenticated;

-- Cualquiera autenticado puede LEER la matriz (para adaptar su interfaz);
-- solo el app_admin puede modificarla.
drop policy if exists rp_sel on role_permissions;
create policy rp_sel on role_permissions for select using (true);
drop policy if exists rp_mut on role_permissions;
create policy rp_mut on role_permissions for all
  using (es_app_admin()) with check (es_app_admin());

-- Catálogo de permisos (claves): panel, aprobar_altas, aprobar_reservas,
-- aprobar_anuncios, bloquear_anuncios, aprobar_incidencias.
-- Semilla = comportamiento vigente antes de 0010.
insert into role_permissions (rol, permiso) values
  -- panel de gestión / staff (equivale a la antigua es_gestion)
  ('app_admin','panel'),('presidente','panel'),('vicepresidente','panel'),
  ('administrador_finca','panel'),('junta','panel'),
  -- aprobar altas de vecinos (y gestionar usuarios)
  ('app_admin','aprobar_altas'),('presidente','aprobar_altas'),('administrador_finca','aprobar_altas'),
  -- aprobar reservas
  ('app_admin','aprobar_reservas'),('presidente','aprobar_reservas'),
  -- aprobar anuncios (toda la gestión)
  ('app_admin','aprobar_anuncios'),('presidente','aprobar_anuncios'),('vicepresidente','aprobar_anuncios'),
  ('administrador_finca','aprobar_anuncios'),('junta','aprobar_anuncios'),
  -- aprobar/moderar incidencias (toda la gestión)
  ('app_admin','aprobar_incidencias'),('presidente','aprobar_incidencias'),('vicepresidente','aprobar_incidencias'),
  ('administrador_finca','aprobar_incidencias'),('junta','aprobar_incidencias'),
  -- bloquear anuncios de una vivienda
  ('app_admin','bloquear_anuncios'),('presidente','bloquear_anuncios'),('administrador_finca','bloquear_anuncios')
on conflict do nothing;

-- Helper central: ¿el usuario actual (activo) tiene el permiso p?
-- app_admin lo tiene siempre (SUPERADMIN). SECURITY DEFINER evita recursión RLS.
create or replace function tiene_permiso(p text) returns boolean
  language sql stable security definer set search_path = public as $$
  select es_activo() and (
    es_app_admin()
    or exists (select 1 from role_permissions rp where rp.rol = rol_actual() and rp.permiso = p)
  );
$$;

-- Reescritura de los helpers para que consulten la tabla (misma firma → las
-- políticas RLS de 0003 siguen funcionando sin tocarse).
create or replace function es_gestion() returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('panel'); $$;

create or replace function puede_aprobar_altas() returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('aprobar_altas'); $$;

create or replace function puede_aprobar_reservas() returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('aprobar_reservas'); $$;

create or replace function puede_aprobar_anuncios() returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('aprobar_anuncios'); $$;

create or replace function puede_bloquear_anuncios() returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('bloquear_anuncios'); $$;
