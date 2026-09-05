-- 0056 · Módulo Calendario: festivos de Madrid + fechas de la comunidad
-- ---------------------------------------------------------------------------
-- specs/21-modulo-calendario.md. Tabla NUEVA, sin hijos (nada referencia
-- calendario_eventos). Todo aditivo: no toca ninguna tabla/columna existente.
-- Tabla + constraints + índices + trigger + grants + RLS + permiso + seed en
-- la MISMA migración (§7.11), idempotente de punta a punta.
--
-- Fuente de los festivos sembrados (Madrid capital, 2026), consultada el
-- 2026-09-05:
--  · Decreto 75/2025, de 24 de septiembre, del Consejo de Gobierno (fiestas
--    laborales 2026 en la Comunidad de Madrid) — BOCM nº 229, 25-09-2025.
--  · Fiestas locales del municipio de Madrid — BOCM nº 296, 12-12-2025.
-- 2027 NO se siembra: sin fuente oficial publicada a 2026-09-05 (decisión del
-- usuario, specs/21 § Festivos sembrados). Nada de ⚠️ SUPUESTO en datos sembrados.
--
-- Aplicar en LOCAL con psql por fichero (igual que 0007..0055, ver CLAUDE.md
-- del repo): `docker exec -i supabase_db_tool-rioja-parking psql -U postgres
-- -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/0056_calendario.sql`.
-- En PRODUCCIÓN se aplica vía Management API (lo hace el orquestador; el CLI
-- de esta máquina no tiene privilegios sobre el proyecto, ver journal.md).

create table if not exists calendario_eventos (
  id         uuid primary key default gen_random_uuid(),
  -- NO enum: `alter type … add value` + su uso en la MISMA transacción da
  -- 55P04 y ya rompió un `db reset` (0007_incidencias_moderacion). `text
  -- check` se amplía sin ese riesgo.
  tipo       text not null check (tipo in ('festivo','comunidad')),
  titulo     text not null check (char_length(titulo) between 1 and 100),
  nota       text null check (nota is null or char_length(nota) <= 500),
  fecha      date not null check (fecha >= date '2020-01-01'),
  fecha_fin  date null check (fecha_fin is null or fecha_fin >= fecha)
                   check (fecha_fin is null or fecha_fin - fecha <= 366),
  fuente     text null,
  created_by uuid null references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cal_fecha on calendario_eventos(fecha);
-- Único parcial: solo los festivos no pueden repetir (fecha, título); los
-- eventos de comunidad SÍ pueden coincidir de día (p. ej. junta + cierre de
-- piscina el mismo fin de semana). El seed de abajo depende de este índice
-- para ser idempotente.
create unique index if not exists idx_cal_festivo_unico
  on calendario_eventos(fecha, titulo) where (tipo = 'festivo');

-- updated_at: reutiliza la función genérica set_updated_at() de 0002 (mismo
-- patrón que profiles/incidencias; no hace falta una función propia).
drop trigger if exists trg_calendario_eventos_updated on calendario_eventos;
create trigger trg_calendario_eventos_updated before update on calendario_eventos
  for each row execute function set_updated_at();

alter table calendario_eventos enable row level security;

-- Grants EXPLÍCITOS (lección de 0055_health: no heredar privilegios de
-- `public`, concederlos uno a uno para que local y prod queden iguales).
revoke all on calendario_eventos from anon, authenticated;
grant select, insert, update, delete on calendario_eventos to authenticated;
grant all on calendario_eventos to service_role;
-- Nada a `anon`: los festivos los lee cualquier CUENTA activa (RLS), no la
-- anon key sin sesión (specs/21: "la anon key no lee el calendario").

drop policy if exists cal_sel on calendario_eventos;
create policy cal_sel on calendario_eventos for select using (es_activo());

drop policy if exists cal_ins on calendario_eventos;
create policy cal_ins on calendario_eventos for insert with check (
  es_activo() and not es_tester()
  and tiene_permiso('gestionar_calendario') and created_by = auth.uid()
);

drop policy if exists cal_upd on calendario_eventos;
create policy cal_upd on calendario_eventos for update using (
  es_activo() and not es_tester() and tiene_permiso('gestionar_calendario')
) with check (
  es_activo() and not es_tester() and tiene_permiso('gestionar_calendario')
);

drop policy if exists cal_del on calendario_eventos;
create policy cal_del on calendario_eventos for delete using (
  es_activo() and not es_tester() and tiene_permiso('gestionar_calendario')
);

-- Permiso nuevo 'gestionar_calendario' (grupo «Calendario» en GRUPOS_PERMISOS,
-- src/lib/roles.ts): gestión por defecto MENOS conserje; app_admin implícito
-- (SUPERADMIN, tiene_permiso() lo cubre sin fila). tester NUNCA (es_tester()
-- manda en la RLS aunque se le conceda la fila). Debe coincidir con DEFAULTS
-- de roles.ts (patrón 0041/0044).
insert into role_permissions (rol, permiso) values
  ('presidente','gestionar_calendario'),
  ('vicepresidente','gestionar_calendario'),
  ('administrador_finca','gestionar_calendario'),
  ('junta','gestionar_calendario')
on conflict do nothing;

-- Festivos 2026 (Madrid capital: nacionales + Comunidad de Madrid + los 2
-- locales del municipio). created_by null (origen: migración, no una cuenta).
-- Idempotente por el índice único parcial de arriba (specs/21 C7).
insert into calendario_eventos (tipo, titulo, fecha, fuente) values
  ('festivo','Año Nuevo','2026-01-01','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Epifanía del Señor','2026-01-06','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Jueves Santo','2026-04-02','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Viernes Santo','2026-04-03','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Fiesta del Trabajo','2026-05-01','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Fiesta de la Comunidad de Madrid','2026-05-02','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','San Isidro Labrador','2026-05-15','Fiestas locales del municipio de Madrid (BOCM nº 296, 12-12-2025) · consultado 2026-09-05'),
  ('festivo','Asunción de la Virgen','2026-08-15','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Fiesta Nacional de España','2026-10-12','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Todos los Santos (trasladado del domingo 1)','2026-11-02','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Nuestra Señora de la Almudena','2026-11-09','Fiestas locales del municipio de Madrid (BOCM nº 296, 12-12-2025) · consultado 2026-09-05'),
  ('festivo','Día de la Constitución (trasladado del domingo 6)','2026-12-07','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Inmaculada Concepción','2026-12-08','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05'),
  ('festivo','Natividad del Señor','2026-12-25','Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05')
on conflict do nothing;
