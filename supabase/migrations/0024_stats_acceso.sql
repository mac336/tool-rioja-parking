-- 0024 · Estadística de acceso para el dashboard de adopción
-- Cuántas cuentas activas HAY y cuántas han conseguido INICIAR SESIÓN alguna vez
-- (auth.users.last_sign_in_at). SECURITY DEFINER (lee auth.users) pero solo lo
-- puede usar la gestión (es_gestion), que ya ve el censo.
create or replace function stats_acceso()
returns table(creados int, entrados int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_gestion() then
    raise exception 'No autorizado';
  end if;
  return query
    select
      (select count(*) from profiles p where p.estado = 'activo')::int,
      (select count(*) from profiles p
         join auth.users u on u.id = p.id
        where p.estado = 'activo' and u.last_sign_in_at is not null)::int;
end $$;

grant execute on function stats_acceso() to authenticated;
