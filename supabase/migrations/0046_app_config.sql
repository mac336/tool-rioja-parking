-- 0046 · Configuración general de la app (feature flags) + reactivar aprobación
-- ---------------------------------------------------------------------------
-- Tabla clave→valor para ajustes que el app_admin cambia EN VIVO (sin desplegar):
--   · acceso_directo (bool, default true): si true, los aprobados entran solo con
--     el correo; si false, se exige código OTP ("comprobación de cuenta"). El
--     login la lee sin sesión → lectura anónima permitida (solo son flags).
--   · reservas_requieren_aprobacion (bool, default false): si true, las reservas
--     nacen 'pendiente' y las aprueba la gestión; si false, aprobación directa.
-- Escritura: solo app_admin.

create table if not exists app_config (
  clave      text primary key,
  valor      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_config (clave, valor) values
  ('acceso_directo', 'true'::jsonb),
  ('reservas_requieren_aprobacion', 'false'::jsonb)
on conflict (clave) do nothing;

alter table app_config enable row level security;
grant select on app_config to anon, authenticated;
grant insert, update on app_config to authenticated;

drop policy if exists cfg_sel on app_config;
create policy cfg_sel on app_config for select using (true);
drop policy if exists cfg_mut on app_config;
create policy cfg_mut on app_config for all using (es_app_admin()) with check (es_app_admin());

-- Reactivar la política de UPDATE de la gestión sobre reservas (se retiró en
-- 0039 al quitar la aprobación). Necesaria SOLO cuando el flag de aprobación
-- está activo: permite a la gestión aprobar/rechazar reservas de cualquiera.
-- Inofensiva con el flag apagado (nadie crea 'pendiente').
drop policy if exists res_upd_gestion on reservas;
create policy res_upd_gestion on reservas for update
  using (es_gestion()) with check (es_gestion());
