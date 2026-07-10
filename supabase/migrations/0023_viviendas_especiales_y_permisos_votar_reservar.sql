-- 0023 · "Viviendas" especiales (no cuentan) + permisos votar/reservar
--
-- 1) Viviendas especiales: Conserje, Administrador, Tester. Son asignaciones
--    para cuentas que NO representan un piso. Se marcan con es_piso=false y
--    quedan EXCLUIDAS de: censo de viviendas (denominador de votaciones),
--    conteo de vecinos por piso (adopción) y parking (que va por los pisos
--    definidos en el código). Solo se ofrecen en el alta directa del panel.
alter table viviendas add column if not exists es_piso boolean not null default true;

insert into viviendas (codigo, orden, puede_publicar_anuncios, es_piso) values
  ('Conserje',      100, false, false),
  ('Administrador', 101, false, false),
  ('Tester',        102, false, false)
on conflict (codigo) do nothing;

-- 2) Nuevos permisos CONFIGURABLES: votar en encuestas y realizar reservas.
--    Semilla: todos los roles de vecino/gestión EXCEPTO tester (solo lectura).
--    app_admin los tiene siempre (SUPERADMIN, implícito en tiene_permiso).
insert into role_permissions (rol, permiso) values
  ('presidente','votar_encuestas'),('vicepresidente','votar_encuestas'),
  ('administrador_finca','votar_encuestas'),('junta','votar_encuestas'),
  ('conserje','votar_encuestas'),('vecino','votar_encuestas'),
  ('presidente','realizar_reservas'),('vicepresidente','realizar_reservas'),
  ('administrador_finca','realizar_reservas'),('junta','realizar_reservas'),
  ('conserje','realizar_reservas'),('vecino','realizar_reservas')
on conflict do nothing;

create or replace function puede_votar_encuestas() returns boolean
  language sql stable security definer set search_path = public as $$
  select tiene_permiso('votar_encuestas');
$$;

create or replace function puede_hacer_reservas() returns boolean
  language sql stable security definer set search_path = public as $$
  select tiene_permiso('realizar_reservas');
$$;

-- 3) La RLS de votar/reservar pasa a exigir el permiso (sustituye a la
--    exclusión explícita de tester de 0022: el tester no tiene estos permisos).
--    Además la vivienda debe ser un PISO real (es_piso), para que las cuentas
--    especiales no puedan votar/reservar como si fueran una vivienda.
drop policy if exists voto_ins on encuesta_votos;
create policy voto_ins on encuesta_votos for insert
  with check (
    es_activo() and puede_votar_encuestas() and emitido_por = auth.uid()
    and vivienda = mi_vivienda()
    and exists (select 1 from viviendas v where v.codigo = mi_vivienda() and v.es_piso)
  );

drop policy if exists res_ins on reservas;
create policy res_ins on reservas for insert
  with check (
    es_activo() and puede_hacer_reservas() and solicitada_por = auth.uid()
    and vivienda = mi_vivienda()
    and exists (select 1 from viviendas v where v.codigo = mi_vivienda() and v.es_piso)
  );
