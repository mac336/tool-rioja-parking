-- 0016 · Nuevo rol "conserje"
-- Rol asignable como el resto. Sus permisos son configurables desde el panel
-- (tabla role_permissions); por defecto no tiene permisos de gestión (como vecino)
-- hasta que el app_admin se los active.
alter type user_role add value if not exists 'conserje' after 'junta';
