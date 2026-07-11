-- 0026 · Guardar las sugerencias en BD
-- Hasta ahora las sugerencias solo se enviaban (correo/push) y NO se guardaban:
-- con los correos de notificación desactivados, si el push se perdía, el texto
-- desaparecía. Ahora la Edge Function `enviar-sugerencia` (service_role) las
-- inserta aquí y el app_admin las lee en el Dashboard.
create table if not exists sugerencias (
  id         uuid primary key default gen_random_uuid(),
  autor_id   uuid references profiles(id),
  nombre     text not null,
  vivienda   text,
  texto      text not null,
  created_at timestamptz not null default now()
);

alter table sugerencias enable row level security;
grant select on sugerencias to authenticated;

-- Solo el app_admin (desarrollador) las lee. Nadie escribe desde el cliente:
-- inserta la Edge Function con service_role (valida vecino activo y no tester).
drop policy if exists sug_sel on sugerencias;
create policy sug_sel on sugerencias for select using (es_app_admin());
