-- 0012 · Mensajes públicos + Buzón privado vecino↔administración
-- Reemplaza los flujos de anuncios/incidencias creados por vecinos por un modelo
-- unificado de "mensajes" que SOLO publica la gestión (tipo aviso/anuncio/
-- incidencia), y añade un buzón privado 1:1 para que el vecino reporte cosas y la
-- gestión responda (y pueda convertir un reporte en mensaje público).

-- ===========================================================================
-- 1) Mensajes públicos
-- ===========================================================================
do $$ begin
  create type mensaje_tipo as enum ('aviso','anuncio','incidencia');
exception when duplicate_object then null; end $$;

create table if not exists mensajes (
  id         uuid primary key default gen_random_uuid(),
  tipo       mensaje_tipo not null,
  titulo     text not null check (char_length(titulo) between 1 and 140),
  cuerpo     text not null check (char_length(cuerpo) between 1 and 4000),
  created_by uuid references profiles(id) on delete set null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_mensajes_activo on mensajes(tipo, created_at desc) where activo;

alter table mensajes enable row level security;
grant select, insert, update, delete on mensajes to authenticated;
drop policy if exists msg_sel on mensajes;
create policy msg_sel on mensajes for select using (es_activo());
drop policy if exists msg_ins on mensajes;
create policy msg_ins on mensajes for insert with check (tiene_permiso('publicar_mensajes'));
drop policy if exists msg_upd on mensajes;
create policy msg_upd on mensajes for update using (tiene_permiso('publicar_mensajes')) with check (tiene_permiso('publicar_mensajes'));
drop policy if exists msg_del on mensajes;
create policy msg_del on mensajes for delete using (tiene_permiso('publicar_mensajes'));

-- Nuevo permiso personalizable: publicar mensajes (semilla = gestión actual).
insert into role_permissions (rol, permiso) values
  ('app_admin','publicar_mensajes'),('presidente','publicar_mensajes'),('vicepresidente','publicar_mensajes'),
  ('administrador_finca','publicar_mensajes'),('junta','publicar_mensajes')
on conflict do nothing;

-- ===========================================================================
-- 2) Buzón privado (hilos vecino ↔ administración)
-- ===========================================================================
do $$ begin
  create type hilo_estado as enum ('abierto','cerrado');
exception when duplicate_object then null; end $$;

create table if not exists hilos (
  id               uuid primary key default gen_random_uuid(),
  vecino_id        uuid not null references profiles(id) on delete cascade,
  asunto           text not null check (char_length(asunto) between 1 and 140),
  estado           hilo_estado not null default 'abierto',
  no_leido_gestion boolean not null default true,
  no_leido_vecino  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_hilos_vecino on hilos(vecino_id);
create index if not exists idx_hilos_updated on hilos(updated_at desc);

alter table hilos enable row level security;
grant select, insert, update on hilos to authenticated;
drop policy if exists hilo_sel on hilos;
create policy hilo_sel on hilos for select using (vecino_id = auth.uid() or es_gestion());
drop policy if exists hilo_ins on hilos;
create policy hilo_ins on hilos for insert with check (vecino_id = auth.uid() and es_activo());
drop policy if exists hilo_upd on hilos;
create policy hilo_upd on hilos for update using (vecino_id = auth.uid() or es_gestion()) with check (vecino_id = auth.uid() or es_gestion());

create table if not exists hilo_mensajes (
  id         uuid primary key default gen_random_uuid(),
  hilo_id    uuid not null references hilos(id) on delete cascade,
  autor_id   uuid not null references profiles(id),
  de_gestion boolean not null default false,
  texto      text not null check (char_length(texto) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists idx_hilomsg_hilo on hilo_mensajes(hilo_id, created_at);

alter table hilo_mensajes enable row level security;
grant select, insert on hilo_mensajes to authenticated;
drop policy if exists hm_sel on hilo_mensajes;
create policy hm_sel on hilo_mensajes for select using (
  exists (select 1 from hilos h where h.id = hilo_id and (h.vecino_id = auth.uid() or es_gestion()))
);
drop policy if exists hm_ins on hilo_mensajes;
create policy hm_ins on hilo_mensajes for insert with check (
  es_activo() and autor_id = auth.uid()
  and exists (select 1 from hilos h where h.id = hilo_id and (h.vecino_id = auth.uid() or es_gestion()))
);

-- de_gestion NO es de confianza en el cliente: lo fija el servidor según quién
-- escribe. Y cada mensaje marca el hilo como no leído para la otra parte.
create or replace function hilo_mensaje_before_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := coalesce(new.autor_id, auth.uid());
  new.de_gestion := es_gestion();
  return new;
end; $$;
drop trigger if exists trg_hilomsg_before on hilo_mensajes;
create trigger trg_hilomsg_before before insert on hilo_mensajes
  for each row execute function hilo_mensaje_before_insert();

create or replace function hilo_mensaje_after_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update hilos set
    updated_at = now(),
    estado = 'abierto',
    no_leido_gestion = case when new.de_gestion then no_leido_gestion else true end,
    no_leido_vecino  = case when new.de_gestion then true else no_leido_vecino end
  where id = new.hilo_id;
  return new;
end; $$;
drop trigger if exists trg_hilomsg_after on hilo_mensajes;
create trigger trg_hilomsg_after after insert on hilo_mensajes
  for each row execute function hilo_mensaje_after_insert();
