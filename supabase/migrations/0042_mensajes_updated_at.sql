-- 0042 · mensajes.updated_at — permite "resucitar" un mensaje al editarlo
-- ---------------------------------------------------------------------------
-- El tablón de Inicio mostrará los anuncios/avisos según la fecha más reciente
-- (creación o edición). Al editar, un trigger pone updated_at = now(), de modo
-- que el mensaje vuelve a considerarse "reciente" y reaparece en Inicio.

alter table mensajes add column if not exists updated_at timestamptz;
-- Backfill: los existentes conservan su fecha (no resucitan de golpe).
update mensajes set updated_at = created_at where updated_at is null;
alter table mensajes alter column updated_at set default now();
alter table mensajes alter column updated_at set not null;

create or replace function mensajes_set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists mensajes_updated_at on mensajes;
create trigger mensajes_updated_at before update on mensajes
  for each row execute function mensajes_set_updated_at();
