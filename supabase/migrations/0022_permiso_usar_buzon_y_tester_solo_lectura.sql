-- 0022 · Permiso 'usar_buzon' (chatear) + tester solo lectura
-- 1) Nuevo permiso configurable por rol: usar el buzón (chat privado). Semilla:
--    TODOS los roles lo tienen (comportamiento actual), incluido tester.
-- 2) El tester queda de SOLO LECTURA: las políticas de acciones de vecino
--    (reservar, votar, ceder plaza) excluyen es_tester(). El resto de acciones
--    ya exigen permisos de gestión que el tester no tiene.

-- Helper: ¿el usuario actual es tester?
create or replace function es_tester() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'tester');
$$;

-- Semilla del permiso usar_buzon para todos los roles configurables.
insert into role_permissions (rol, permiso) values
  ('presidente','usar_buzon'),('vicepresidente','usar_buzon'),
  ('administrador_finca','usar_buzon'),('junta','usar_buzon'),
  ('conserje','usar_buzon'),('vecino','usar_buzon'),('tester','usar_buzon')
on conflict do nothing;

-- ¿Puede chatear por el buzón? (app_admin siempre; el resto según la matriz.)
create or replace function puede_usar_buzon() returns boolean
  language sql stable security definer set search_path = public as $$
  select tiene_permiso('usar_buzon');
$$;

-- Buzón: escribir exige el permiso (leer no cambia).
drop policy if exists hilo_ins on hilos;
create policy hilo_ins on hilos for insert
  with check (vecino_id = auth.uid() and es_activo() and puede_usar_buzon());

drop policy if exists hm_ins on hilo_mensajes;
create policy hm_ins on hilo_mensajes for insert
  with check (
    es_activo() and puede_usar_buzon() and autor_id = auth.uid()
    and exists (
      select 1 from hilos h
      where h.id = hilo_mensajes.hilo_id
        and (h.vecino_id = auth.uid() or puede_ver_hilo(h.canal))
    )
  );

-- Acciones de vecino: el tester NO puede (solo lectura).
drop policy if exists res_ins on reservas;
create policy res_ins on reservas for insert
  with check (es_activo() and not es_tester() and vivienda = mi_vivienda() and solicitada_por = auth.uid());

drop policy if exists voto_ins on encuesta_votos;
create policy voto_ins on encuesta_votos for insert
  with check (es_activo() and not es_tester() and vivienda = mi_vivienda() and emitido_por = auth.uid());

drop policy if exists ces_ins on parking_cesiones;
create policy ces_ins on parking_cesiones for insert
  with check (es_activo() and not es_tester() and vivienda = mi_vivienda());
