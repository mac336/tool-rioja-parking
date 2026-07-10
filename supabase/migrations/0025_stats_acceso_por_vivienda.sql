-- 0025 · Acceso por vivienda (para el dashboard de adopción)
-- Por cada piso con cuenta activa: cuántas cuentas tiene y cuántas han iniciado
-- sesión alguna vez. Permite marcar en la tabla si el piso "ha entrado" o solo
-- tiene la cuenta creada. SECURITY DEFINER (lee auth.users), solo gestión.
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
     where p.estado = 'activo' and p.vivienda is not null
     group by p.vivienda;
end $$;

grant execute on function stats_acceso_por_vivienda() to authenticated;
