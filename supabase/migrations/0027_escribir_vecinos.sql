-- 0027 · La gestión puede INICIAR chats del buzón con cualquier vecino
-- Nuevo permiso configurable 'escribir_vecinos' (semilla: administrador_finca y
-- conserje; app_admin siempre). Quien lo tiene puede crear un hilo dirigido a un
-- vecino EN SU PROPIO CANAL (puede_ver_hilo garantiza que el canal corresponde a
-- su rol; la privacidad entre canales se mantiene).
insert into role_permissions (rol, permiso) values
  ('administrador_finca','escribir_vecinos'),
  ('conserje','escribir_vecinos')
on conflict do nothing;

create or replace function puede_escribir_vecinos() returns boolean
  language sql stable security definer set search_path = public as $$
  select tiene_permiso('escribir_vecinos');
$$;

-- Crear hilo: el vecino para sí mismo (como hasta ahora) O la gestión con el
-- permiso, dirigido a otro usuario, en un canal que atiende.
drop policy if exists hilo_ins on hilos;
create policy hilo_ins on hilos for insert
  with check (
    (vecino_id = auth.uid() and es_activo() and puede_usar_buzon())
    or (vecino_id <> auth.uid() and es_activo() and puede_escribir_vecinos() and puede_ver_hilo(canal))
  );
