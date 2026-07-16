-- 0047 · Analítica: quién tiene la app INSTALADA (PWA en el móvil)
-- ---------------------------------------------------------------------------
-- profiles.pwa_at = última vez que la app se abrió en modo instalado
-- (display-mode: standalone). La app lo sella al arrancar si corre instalada.
-- Sirve para saber cuántos vecinos ya la tienen en su móvil (p. ej. antes de
-- reactivar la comprobación por código).

alter table profiles add column if not exists pwa_at timestamptz;

-- El vecino marca su propia cuenta (no puede tocar otras columnas: el UPDATE de
-- profiles está limitado; por eso va por función security definer).
create or replace function registrar_pwa() returns void
  language sql security definer set search_path = public as $$
  update profiles set pwa_at = now() where id = auth.uid() and estado = 'activo';
$$;
grant execute on function registrar_pwa() to authenticated;

-- Extender stats_acceso con 'instalados' (cuentas activas con la app instalada).
-- (Cambia el tipo de retorno → hay que soltarla antes de recrearla.)
drop function if exists stats_acceso();
create or replace function stats_acceso()
returns table(creados int, entrados int, instalados int)
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
        where p.estado = 'activo' and u.last_sign_in_at is not null)::int,
      (select count(*) from profiles p where p.estado = 'activo' and p.pwa_at is not null)::int;
end $$;

grant execute on function stats_acceso() to authenticated;
