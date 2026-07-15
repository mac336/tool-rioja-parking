-- 0037 · "Mi Comunidad" — almacén de datos económicos extraídos de las actas
-- ---------------------------------------------------------------------------
-- Tabla clave→jsonb para alimentar el dashboard "Mi Comunidad" (finanzas,
-- comparativa año a año y acuerdos de las juntas).
--
-- PRIVACIDAD (importante): el repositorio y la web son PÚBLICOS. Por eso:
--   · Esta migración NO contiene ningún dato/número: solo la estructura y la RLS.
--   · Los datos se cargan con un seed aparte, NO versionado (actas/ está en
--     .gitignore). Ver actas/seed-comunidad-datos.sql.
--   · La RLS restringe la lectura al rol app_admin (el "developer"). Mientras se
--     decide si el servicio se abre a los vecinos, NADIE más lo puede leer, ni
--     siquiera con la anon key (la seguridad la impone la RLS, no la interfaz).
--
-- Cuando se decida abrir a vecinos, basta relajar la policy de SELECT.

create table if not exists comunidad_datos (
  clave       text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table comunidad_datos is
  'Datos económicos de la comunidad (dashboard Mi Comunidad). Filas: finanzas, comparativa, acuerdos. Cargado por seed no versionado; RLS solo app_admin.';

alter table comunidad_datos enable row level security;

-- Lectura: SOLO app_admin (developer) por ahora.
drop policy if exists comunidad_datos_select on comunidad_datos;
create policy comunidad_datos_select on comunidad_datos
  for select using (es_app_admin());

-- Escritura: nadie desde el cliente. El seed se aplica con service role / psql,
-- que salta la RLS. No creamos policies de insert/update/delete.

grant select on comunidad_datos to authenticated;
