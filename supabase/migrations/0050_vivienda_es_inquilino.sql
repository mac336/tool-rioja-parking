-- 0050 · Marca de vivienda "ocupada por inquilino" (para adopción)
-- ---------------------------------------------------------------------------
-- Complementa a 0049: un piso puede ser de inquilino ANTES de que su ocupante
-- tenga cuenta en la app. Con esta marca, la gestión excluye de la adopción
-- pisos de inquilino ya "detectados" aunque todavía no se hayan registrado.
--
-- La adopción excluye un piso si: está marcado (viviendas.es_inquilino) O tiene
-- una cuenta de rol inquilino activa (0049). Cuando el inquilino se registra
-- como tal, la exclusión se mantiene por cualquiera de las dos vías.

alter table viviendas add column if not exists es_inquilino boolean not null default false;

-- Unir ambas fuentes: viviendas marcadas + viviendas con cuenta de inquilino.
create or replace function viviendas_inquilino()
returns table(vivienda text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_gestion() then
    raise exception 'No autorizado';
  end if;
  return query
    select v.codigo from viviendas v where v.es_inquilino
    union
    select distinct p.vivienda
      from profiles p
     where p.estado = 'activo' and p.rol = 'inquilino' and p.vivienda is not null;
end $$;
grant execute on function viviendas_inquilino() to authenticated;
