-- 0054 · Post-its: grado de importancia (orden invisible) + color pastel
-- ---------------------------------------------------------------------------
-- `grado` (1..3, NULL = por defecto del tipo: incidencia 3 / aviso 2 / anuncio 1)
--   ordena el tablón de la HOME: grado desc y, a igual grado, más reciente arriba.
--   Es INVISIBLE (no se muestra ninguna etiqueta): solo decide la posición.
-- `color` es la clave de un color PASTEL del catálogo del cliente (papel del
--   post-it); NULL = papel por defecto del tipo/estilo.
-- Solo quien puede PUBLICAR ese tipo (gestión, permiso publicar_<tipo>) puede
-- fijarlos: un trigger los limpia si el autor no tiene el permiso (los vecinos
-- que proponen desde el buzón no pueden ni verlos ni colarlos).

alter table mensajes add column if not exists grado smallint
  check (grado is null or grado between 1 and 3);
alter table mensajes add column if not exists color text
  check (color is null or char_length(color) <= 20);

create or replace function mensajes_guard_grado_color() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if es_app_admin() or tiene_permiso('publicar_' || new.tipo::text) then
    return new; -- autorizado: puede fijar/editar grado y color
  end if;
  if tg_op = 'INSERT' then
    new.grado := null;
    new.color := null;
  else
    -- update sin permiso (p. ej. vecino editando su borrador): conserva lo previo
    new.grado := old.grado;
    new.color := old.color;
  end if;
  return new;
end $$;

drop trigger if exists trg_mensajes_guard_grado_color on mensajes;
create trigger trg_mensajes_guard_grado_color
  before insert or update on mensajes
  for each row execute function mensajes_guard_grado_color();
