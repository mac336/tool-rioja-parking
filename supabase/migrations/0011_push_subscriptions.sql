-- 0011 · Suscripciones de notificaciones push (Web Push / VAPID)
-- Cada dispositivo del vecino que activa notificaciones guarda aquí su
-- suscripción. El envío lo hace el servidor (Edge Function con la clave privada
-- VAPID). El usuario solo gestiona las suyas; el servicio (service_role) lee todo.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
grant select, insert, update, delete on push_subscriptions to authenticated;

-- El vecino solo ve/gestiona sus propias suscripciones.
drop policy if exists push_sel on push_subscriptions;
create policy push_sel on push_subscriptions for select using (user_id = auth.uid());
drop policy if exists push_ins on push_subscriptions;
create policy push_ins on push_subscriptions for insert with check (user_id = auth.uid() and es_activo());
drop policy if exists push_upd on push_subscriptions;
create policy push_upd on push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_del on push_subscriptions;
create policy push_del on push_subscriptions for delete using (user_id = auth.uid());
