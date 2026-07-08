-- 0006 · Reservas multi-zona
-- Una reserva "de vecino" puede abarcar VARIAS zonas comunes en el mismo horario
-- (p. ej. Jardín + Sala para una fiesta). Se modela como N filas de `reservas`
-- que comparten un `grupo_id`. Se sigue creando/aprobando/cancelando en bloque.
-- El anti-solape por zona (constraint reservas_no_solapan, 0001) se mantiene y
-- valida cada zona por separado. La regla "1 reserva vigente por vivienda" se
-- aplica en la app sobre el grupo (mismo inicio/fin/vivienda).
alter table reservas add column if not exists grupo_id uuid;

-- Índice para agrupar/rehidratar por grupo de forma barata.
create index if not exists idx_reservas_grupo on reservas(grupo_id);

-- Filas antiguas (una zona) sin grupo: cada una es su propio grupo.
update reservas set grupo_id = id where grupo_id is null;
