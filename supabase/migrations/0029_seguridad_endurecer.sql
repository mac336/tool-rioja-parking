-- 0029 · Endurecimiento de seguridad (auditoría 2026-07-11)
--
-- `log_audit` es SECURITY DEFINER e inserta en `audit_log`. La llaman los
-- triggers (que corren como su propio definer), así que revocar el EXECUTE
-- público NO los rompe, pero impide que un usuario la invoque directamente para
-- FALSEAR entradas del registro de auditoría.
revoke execute on function log_audit(text, text, uuid, jsonb) from public, anon, authenticated;

-- La matriz de permisos no necesita ser pública: basta con usuarios activos
-- (el cliente la lee tras iniciar sesión para adaptar la interfaz).
drop policy if exists rp_sel on role_permissions;
create policy rp_sel on role_permissions for select using (es_activo());
