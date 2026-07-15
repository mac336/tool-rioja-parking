-- 0044 · Agenda de reservas visible por permiso (no solo desde el panel)
-- ---------------------------------------------------------------------------
-- Nuevo permiso 'ver_agenda_reservas' (grupo Reservas): quien lo tenga puede ver
-- el calendario con las reservas de TODAS las viviendas y zonas (para ayudar a
-- los vecinos a encontrar hueco libre), sin necesitar el permiso 'panel' ni
-- entrar al panel de gestión. Default: gestión + conserje.

insert into role_permissions (rol, permiso) values
  ('presidente','ver_agenda_reservas'),
  ('vicepresidente','ver_agenda_reservas'),
  ('administrador_finca','ver_agenda_reservas'),
  ('junta','ver_agenda_reservas'),
  ('conserje','ver_agenda_reservas')
on conflict do nothing;

-- SELECT de reservas: además de "mi vivienda" y "es_gestion()", también quien
-- tenga el nuevo permiso ve todas las filas (necesario para reservasGestion()).
drop policy if exists res_sel on reservas;
create policy res_sel on reservas for select using (
  vivienda = mi_vivienda() or es_gestion() or tiene_permiso('ver_agenda_reservas')
);
