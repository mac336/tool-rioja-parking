-- _health — tabla mínima para el keep-alive/health check del Nivel 0 (harness §7.14).
-- Un SELECT sobre esta tabla cuenta como actividad de BD y resetea el contador de
-- inactividad de Supabase (pausa a los 7 días en free-tier). RLS de solo-lectura pública
-- en la MISMA migración que crea la tabla (§7.11): no expone nada y evita usar service_role.

create table if not exists public._health (
  id         int primary key,
  checked_at timestamptz not null default now()
);

insert into public._health (id) values (1)
  on conflict (id) do nothing;

alter table public._health enable row level security;

-- Privilegios EXPLÍCITOS, no heredados: los default privileges de `public` no
-- coinciden entre entornos (local recorta anon a `Dxtm`, sin SELECT → la REST
-- daría 401 y el keep-alive fallaría cada 6 h sin pingar nada; el proyecto de
-- prod, más antiguo, los deja permisivos `arwdDxtm` → anon nacería con INSERT/
-- UPDATE/DELETE a nivel de tabla, tapados solo por RLS).
-- Con revoke + grant la tabla queda igual en los dos sitios: solo SELECT.
-- Nadie escribe aquí, tampoco el workflow.
revoke all on public._health from anon, authenticated;
grant select on public._health to anon, authenticated;
-- service_role con acceso total, como el resto de tablas (0003_rls.sql): ese
-- `grant all ... on all tables` solo alcanzó a las tablas de entonces.
grant all on public._health to service_role;

drop policy if exists "_health public read" on public._health;
create policy "_health public read"
  on public._health
  for select
  to anon, authenticated
  using (true);
