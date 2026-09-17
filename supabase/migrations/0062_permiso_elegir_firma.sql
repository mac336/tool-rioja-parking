-- 0062 · Firmar en nombre de otro pasa a ser un PERMISO (y lo impone la BD)
-- ---------------------------------------------------------------------------
-- El catálogo de firmas del asistente incluye «Administrador», «Conserje»,
-- «la Junta»… y TODOS LOS PISOS. Cualquiera que llegara al alta directa podía
-- firmar a nombre de otro vecino. Y la firma no tenía ninguna barrera en BD: el
-- guard de la 0054 solo protegía `grado` y `color`, así que la interfaz era la
-- única defensa (justo lo que CLAUDE.md dice que NO debe pasar).
--
-- Ahora: quien no tenga `elegir_firma` publica SIN firma, y el post-it muestra a
-- su autor. El app_admin queda exento (SUPERADMIN).
insert into role_permissions (rol, permiso) values
  ('presidente','elegir_firma'),
  ('vicepresidente','elegir_firma'),
  ('administrador_finca','elegir_firma'),
  ('junta','elegir_firma'),
  ('conserje','elegir_firma')   -- firma como «Conserje» en sus avisos
on conflict do nothing;

-- Guard: mismo patrón que mensajes_guard_grado_color (0054).
create or replace function mensajes_guard_firma() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if es_app_admin() or tiene_permiso('elegir_firma') then
    return new;                      -- autorizado: puede firmar como quiera
  end if;
  if tg_op = 'INSERT' then
    new.firma := null;               -- sin firma: el post-it mostrará al autor
  else
    new.firma := old.firma;          -- update sin permiso: conserva la previa
  end if;
  return new;
end $$;

drop trigger if exists trg_mensajes_guard_firma on mensajes;
create trigger trg_mensajes_guard_firma before insert or update on mensajes
  for each row execute function mensajes_guard_firma();
