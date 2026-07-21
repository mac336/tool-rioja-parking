-- 0053 · Registrar la VERSIÓN de la app por dispositivo/vivienda
-- ---------------------------------------------------------------------------
-- La app sella su versión al arrancar (como pwa_at). Sirve para avisar SOLO a
-- los vecinos que NO están en la última versión (los que siguen en una vieja no
-- tienen este código, así que su app_version queda NULL → "desactualizado").
alter table profiles add column if not exists app_version text;

create or replace function registrar_version(v text) returns void
  language sql security definer set search_path = public as $$
  update profiles set app_version = v where id = auth.uid() and estado = 'activo';
$$;
grant execute on function registrar_version(text) to authenticated;
