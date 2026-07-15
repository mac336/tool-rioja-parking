-- 0041 · "Mi Comunidad" pasa a permiso configurable
-- ---------------------------------------------------------------------------
-- Antes solo lo leía app_admin (0037). Ahora la visibilidad la controla el
-- permiso `ver_mi_comunidad` (personalizable por rol). Default: todos MENOS el
-- conserje y el administrador de finca. (app_admin = SUPERADMIN, no necesita fila.)

-- Semilla del permiso (idempotente).
insert into role_permissions (rol, permiso) values
  ('presidente','ver_mi_comunidad'),
  ('vicepresidente','ver_mi_comunidad'),
  ('junta','ver_mi_comunidad'),
  ('vecino','ver_mi_comunidad'),
  ('tester','ver_mi_comunidad')
on conflict do nothing;

-- RLS: leer comunidad_datos = tener el permiso (en vez de solo app_admin).
drop policy if exists comunidad_datos_select on comunidad_datos;
create policy comunidad_datos_select on comunidad_datos
  for select using (tiene_permiso('ver_mi_comunidad'));
