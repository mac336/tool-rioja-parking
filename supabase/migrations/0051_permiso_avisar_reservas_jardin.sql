-- 0051 · Permiso "avisar_reservas_jardin"
-- ---------------------------------------------------------------------------
-- Permiso configurable (por rol) para RECIBIR una notificación push cuando
-- alguien reserva el JARDÍN. No habilita ninguna acción: solo decide quién
-- recibe el aviso. Por defecto solo el conserje (el app_admin lo recibe siempre
-- por ser SUPERADMIN). El app_admin puede cambiarlo en Panel → Permisos.
insert into role_permissions (rol, permiso) values
  ('conserje','avisar_reservas_jardin')
on conflict do nothing;
