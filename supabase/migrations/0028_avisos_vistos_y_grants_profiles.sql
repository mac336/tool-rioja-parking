-- 0028 · Última visita a Avisos (por usuario, en BD) + cierre de grants de profiles
--
-- 1) `avisos_vistos_at`: cuándo abrió el usuario la campana por última vez.
--    El contador de "no vistos" compara contra esta fecha → consistente entre
--    dispositivos (web y PWA), no solo en el localStorage del móvil.
alter table profiles add column if not exists avisos_vistos_at timestamptz;

-- 2) SEGURIDAD (importante): `authenticated` tenía UPDATE sobre TODAS las
--    columnas de profiles; junto a la política "actualiza tu propia fila", un
--    usuario podía cambiarse su propio `rol`/`estado` (escalada de privilegios).
--    Se restringe el UPDATE a las únicas columnas que el cliente escribe
--    legítimamente. Los cambios de rol/estado/vivienda siguen siendo solo de
--    las Edge Functions (service_role, no afectada por estos grants).
revoke update on profiles from authenticated;
grant update (nombre, normas_aceptadas_at, avisos_vistos_at) on profiles to authenticated;
