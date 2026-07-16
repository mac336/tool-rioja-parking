-- 0049 · Inquilino: permisos por defecto, tipo en solicitudes y adopción
-- ---------------------------------------------------------------------------
-- Depende de 0048 (el valor 'inquilino' del enum ya commiteado).

-- 1) Permisos por defecto del rol inquilino = los del vecino MENOS
--    ver_mi_comunidad, ver_sugerencia y votar_encuestas. (app_admin no necesita
--    filas; es SUPERADMIN.) Idempotente.
insert into role_permissions (rol, permiso) values
  ('inquilino','ver_aviso'),
  ('inquilino','ver_incidencia'),
  ('inquilino','ver_anuncio'),
  ('inquilino','realizar_reservas'),
  ('inquilino','usar_buzon')
on conflict do nothing;

-- 2) La solicitud de acceso guarda si quien se registra es INQUILINO, para que
--    la gestión lo vea y el alta prefije el rol correcto. Propietario = false.
alter table access_requests add column if not exists es_inquilino boolean not null default false;

-- 3) Adopción de la app: los pisos ocupados por inquilinos NO cuentan (el
--    objetivo es la adopción de propietarios). Se excluyen de los totales y de
--    la tabla por vivienda; y con viviendas_inquilino() se quitan del
--    denominador (catálogo de pisos) en el dashboard.

-- 3a) Totales: cuentas activas / que han entrado / con app instalada, EXCLUYENDO
--     inquilinos.
create or replace function stats_acceso()
returns table(creados int, entrados int, instalados int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_gestion() then
    raise exception 'No autorizado';
  end if;
  return query
    select
      (select count(*) from profiles p where p.estado = 'activo' and p.rol <> 'inquilino')::int,
      (select count(*) from profiles p
         join auth.users u on u.id = p.id
        where p.estado = 'activo' and p.rol <> 'inquilino' and u.last_sign_in_at is not null)::int,
      (select count(*) from profiles p where p.estado = 'activo' and p.rol <> 'inquilino' and p.pwa_at is not null)::int;
end $$;
grant execute on function stats_acceso() to authenticated;

-- 3b) Por vivienda: excluye cuentas de inquilino (así sus pisos no aparecen como
--     "dentro").
create or replace function stats_acceso_por_vivienda()
returns table(vivienda text, cuentas int, entrados int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_gestion() then
    raise exception 'No autorizado';
  end if;
  return query
    select p.vivienda,
           count(*)::int,
           count(*) filter (where u.last_sign_in_at is not null)::int
      from profiles p
      join auth.users u on u.id = p.id
     where p.estado = 'activo' and p.vivienda is not null and p.rol <> 'inquilino'
     group by p.vivienda;
end $$;
grant execute on function stats_acceso_por_vivienda() to authenticated;

-- 3c) Viviendas con al menos una cuenta de INQUILINO activa: el dashboard las
--     quita del total de pisos a inscribir.
create or replace function viviendas_inquilino()
returns table(vivienda text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_gestion() then
    raise exception 'No autorizado';
  end if;
  return query
    select distinct p.vivienda
      from profiles p
     where p.estado = 'activo' and p.rol = 'inquilino' and p.vivienda is not null;
end $$;
grant execute on function viviendas_inquilino() to authenticated;
