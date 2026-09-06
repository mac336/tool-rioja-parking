-- ============================================================================
-- Rioja 25 · Tests de RLS y constraints (se ejecuta con psql -v ON_ERROR_STOP=1)
-- Simula usuarios reales con SET ROLE authenticated + claim JWT (auth.uid()).
-- Cada aserción que falla lanza EXCEPTION y corta el script (test rojo).
-- ============================================================================
\set ON_ERROR_STOP on
set client_min_messages to notice;

-- Helper de aserción de fallo esperado: ejecuta SQL y exige que dé excepción.
create or replace function assert_falla(sql text, etiqueta text)
  returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'OK (falla esperada): %', etiqueta;
    return;
  end;
  raise exception 'FALLO: se esperaba que fallara pero pasó → %', etiqueta;
end; $$;

create or replace function assert_igual(actual bigint, esperado bigint, etiqueta text)
  returns void language plpgsql as $$
begin
  if actual is distinct from esperado then
    raise exception 'FALLO: % → esperaba % y obtuve %', etiqueta, esperado, actual;
  end if;
  raise notice 'OK: % (=%)', etiqueta, actual;
end; $$;

create or replace function assert_min(actual bigint, minimo bigint, etiqueta text)
  returns void language plpgsql as $$
begin
  if actual < minimo then
    raise exception 'FALLO: % → esperaba >=% y obtuve %', etiqueta, minimo, actual;
  end if;
  raise notice 'OK: % (>=%, =%)', etiqueta, minimo, actual;
end; $$;

-- ---------------------------------------------------------------------------
-- Fixtures (como postgres): 2 vecinos + 1 presidente + 1 app_admin
-- ---------------------------------------------------------------------------
\set uidA '11111111-1111-1111-1111-111111111111'
\set uidB '22222222-2222-2222-2222-222222222222'
\set uidP '33333333-3333-3333-3333-333333333333'
\set uidX '44444444-4444-4444-4444-444444444444'
\set uidC '77777777-7777-7777-7777-777777777777'
\set uidT '99999999-9999-9999-9999-999999999999'
\set uidK '88888888-8888-8888-8888-888888888888'
-- Fixtures propios del bloque CAL (calendario): J = junta (permiso por
-- defecto), Z = creador desechable para el test de "borrar la cuenta creadora".
\set uidJ 'cccccccc-ca10-0000-0000-000000000001'
\set uidZ 'cccccccc-ca10-0000-0000-000000000002'

-- Limpieza idempotente: borrar datos dependientes de runs previos antes de los
-- usuarios de prueba (evita fallos de FK al re-ejecutar sin reset).
delete from encuesta_votos where emitido_por in (:'uidA',:'uidB',:'uidP',:'uidX',:'uidC',:'uidT',:'uidK');
-- CAL: solo si la tabla ya existe (mig. 0056); antes de eso NO debe romper el
-- resto de la suite, que sigue verde hasta llegar al bloque CAL de abajo.
do $$ begin
  if to_regclass('public.calendario_eventos') is not null then
    execute $sql$delete from calendario_eventos where titulo like '__cal%'$sql$;
  end if;
end $$;
-- borra reservas por vivienda de prueba (robusto ante datos de otros suites,
-- p. ej. el test de integración, que comparten estas viviendas).
delete from reservas where vivienda in ('Bajo A','1º A Dcha','2º A Dcha','3º A Dcha');
delete from hilos where vecino_id in (:'uidA',:'uidB',:'uidP',:'uidX',:'uidC',:'uidT',:'uidK');
delete from mensajes where titulo in ('__msg A__','__msg pres__','__sug A__','__msg tester__','__aviso fix__','__anuncio fix__');
delete from parking_cesiones where vivienda in ('Bajo A','1º A Dcha','2º A Dcha','3º A Dcha');
delete from encuesta_opciones where pregunta_id in (select id from encuesta_preguntas where encuesta_id in (select id from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__')));
delete from encuesta_preguntas where encuesta_id in (select id from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__'));
delete from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__');
delete from auth.users where id in (
  :'uidA',:'uidB',:'uidP',:'uidX',:'uidC',:'uidT',:'uidK',:'uidJ',:'uidZ',
  '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666');

insert into auth.users (id, email, aud, role, instance_id)
values
  (:'uidA','a@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidB','b@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidP','p@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidX','x@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidC','c@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidT','t@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidK','k@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidJ','j@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidZ','z@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000');

-- handle_new_user creó perfiles 'pendiente'; los activamos con vivienda/rol.
update profiles set vivienda='Bajo A',   rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidA';
update profiles set vivienda='1º A Dcha', rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidB';
update profiles set vivienda='2º A Dcha', rol='presidente', estado='activo', normas_aceptadas_at=now() where id=:'uidP';
update profiles set vivienda='3º A Dcha', rol='app_admin',  estado='activo', normas_aceptadas_at=now() where id=:'uidX';
update profiles set vivienda='1º A Dcha', rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidC'; -- 2ª cuenta de la vivienda de B
update profiles set vivienda='Bajo B',   rol='tester',     estado='activo', normas_aceptadas_at=now() where id=:'uidT';
update profiles set vivienda=null,        rol='conserje',   estado='activo', normas_aceptadas_at=now() where id=:'uidK';
update profiles set vivienda='1º B Dcha', rol='junta',      estado='activo', normas_aceptadas_at=now() where id=:'uidJ'; -- fixture del bloque CAL
update profiles set vivienda='2º B Dcha', rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidZ'; -- creador desechable del bloque CAL

-- Encuesta abierta (formato única) con 1 pregunta y 2 opciones.
insert into encuestas (id, titulo, formato, apertura, cierre, creada_por)
  values ('dddddddd-0000-0000-0000-000000000001','__test__','unica', now()-interval '1 day', now()+interval '7 days', :'uidP');
insert into encuesta_preguntas (id, encuesta_id, texto, tipo, orden)
  values ('cccccccc-0000-0000-0000-000000000009','dddddddd-0000-0000-0000-000000000001','P1','opcion_unica',1);
insert into encuesta_opciones (pregunta_id, texto, orden) values
  ('cccccccc-0000-0000-0000-000000000009','Opción 1',1),
  ('cccccccc-0000-0000-0000-000000000009','Opción 2',2);

-- Mensajes publicados de prueba (como postgres) para la visibilidad por tipo:
-- un aviso (todos lo ven) y un anuncio (el conserje NO debe verlo).
insert into mensajes (tipo, titulo, cuerpo, destino, estado, created_by) values
  ('aviso',   '__aviso fix__',   'x', 'todos', 'publicado', :'uidP'),
  ('anuncio', '__anuncio fix__', 'x', 'todos', 'publicado', :'uidP');

-- ===========================================================================
-- TESTS COMO VECINO A
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);

-- 1) A (activo) ve los 14 contactos
select assert_igual((select count(*) from contactos), 14, 'vecino A lee contactos');

-- 2) A solo ve SU perfil (no el de B) — privacidad
select assert_igual((select count(*) from profiles), 1, 'vecino A solo ve su profile');

-- 3) A ve el directorio (nombre/vivienda/rol) de los activos, sin email
--    (>=4: pueden existir otros activos, p. ej. del test de integración)
select assert_min((select count(*) from directorio), 4, 'vecino A ve directorio de activos');

-- 4) A NO puede leer audit_log (0 filas por RLS)
select assert_igual((select count(*) from audit_log), 0, 'vecino A no lee audit_log');

-- 5) A vota una vez en la pregunta → OK; segundo voto (opción distinta, opción_única) → FALLA
insert into encuesta_votos (pregunta_id, vivienda, opcion_id, emitido_por)
select 'cccccccc-0000-0000-0000-000000000009', 'Bajo A', o.id, :'uidA'
from encuesta_opciones o where o.pregunta_id='cccccccc-0000-0000-0000-000000000009' and o.orden=1;
select assert_falla(
  format($f$insert into encuesta_votos (pregunta_id, vivienda, opcion_id, emitido_por)
    select 'cccccccc-0000-0000-0000-000000000009', 'Bajo A', o.id, '%s' from encuesta_opciones o
    where o.pregunta_id='cccccccc-0000-0000-0000-000000000009' and o.orden=2$f$, :'uidA'),
  'doble voto misma vivienda (opción única)');

-- 6) A crea reserva 10-12h en la zona Jardín → OK
insert into reservas (zona_id, vivienda, solicitada_por, inicio, fin, num_invitados)
select id, 'Bajo A', :'uidA', date_trunc('day', now()+interval '10 day')+interval '10 hour',
       date_trunc('day', now()+interval '10 day')+interval '12 hour', 3
from zonas_comunes where nombre='Jardín';

-- 7) A intenta una SEGUNDA reserva vigente (otra zona) → FALLA (una vigente/vivienda)
select assert_falla(
  format($f$insert into reservas (zona_id, vivienda, solicitada_por, inicio, fin)
    select id, 'Bajo A', '%s', date_trunc('day', now()+interval '11 day')+interval '10 hour',
    date_trunc('day', now()+interval '11 day')+interval '12 hour' from zonas_comunes where nombre='Piscina'$f$, :'uidA'),
  'segunda reserva vigente por vivienda');

-- 8) A NO puede reservar a nombre de OTRA vivienda (sin 'reservar_otras_viviendas')
select assert_falla(
  format($f$insert into reservas (zona_id, vivienda, solicitada_por, inicio, fin)
    select id, '2º A Dcha', '%s', date_trunc('day', now()+interval '12 day')+interval '10 hour',
    date_trunc('day', now()+interval '12 day')+interval '12 hour' from zonas_comunes where nombre='Piscina'$f$, :'uidA'),
  'vecino NO reserva a nombre de otra vivienda');

-- ===========================================================================
-- TESTS COMO VECINO B (solapamiento de franja)
-- ===========================================================================
select set_config('request.jwt.claims', json_build_object('sub',:'uidB','role','authenticated')::text, false);

-- 9) B intenta reservar la MISMA franja/zona que A (11-13 solapa 10-12) → FALLA
select assert_falla(
  format($f$insert into reservas (zona_id, vivienda, solicitada_por, inicio, fin)
    select id, '1º A Dcha', '%s', date_trunc('day', now()+interval '10 day')+interval '11 hour',
    date_trunc('day', now()+interval '10 day')+interval '13 hour' from zonas_comunes where nombre='Jardín'$f$, :'uidB'),
  'reserva solapada misma zona/franja');

-- 10) B NO ve la reserva de A (privacidad: solo su vivienda o gestión)
select assert_igual((select count(*) from reservas), 0, 'vecino B no ve reservas de otras viviendas');

-- 11) B sí ve la OCUPACIÓN (sin identidad) — vista global, >=1 (la privacidad la
--     garantiza la vista, que no expone vivienda/solicitante)
select assert_min((select count(*) from ocupacion_reservas), 1, 'vecino B ve ocupación sin identidad');

-- ===========================================================================
-- TESTS COMO PRESIDENTE (reservas de aprobación directa + encuestas)
-- ===========================================================================
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);

-- 12) Presidente ve la reserva de A (gestión) y ya está aprobada (aprobación directa, sin cola)
select assert_igual((select count(*) from reservas where vivienda='Bajo A'), 1, 'presidente ve reserva de A');
select assert_igual((select count(*) from reservas where vivienda='Bajo A' and estado='aprobada'), 1, 'reserva de A queda aprobada directamente');

-- 13) Presidente crea una encuesta → OK (es gestión)
insert into encuestas (titulo, formato, cierre, creada_por)
values ('__test2__','unica', now()+interval '3 day', :'uidP');
select assert_igual((select count(*) from encuestas where titulo='__test2__'), 1, 'presidente crea encuesta');

-- ===========================================================================
-- TESTS COMO ANÓNIMO
-- ===========================================================================
reset role;
set role anon;
select set_config('request.jwt.claims', json_build_object('role','anon')::text, false);

-- 14) Anónimo lee el catálogo de viviendas (necesario para el formulario público)
-- 41 pisos + las especiales (garajes/local, 0023); el catálogo es público.
select assert_igual((select count(*) from viviendas where es_piso), 41, 'anónimo lee viviendas (41 pisos)');

-- 15) Anónimo NO puede leer contactos (sin grant)
select assert_falla($f$select count(*) from contactos$f$, 'anónimo no accede a contactos');

-- ===========================================================================
-- TEST DE CONSTRAINT: máx. 2 cuentas por vivienda (como postgres)
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '', false);

-- A y B están en viviendas distintas; metemos una 2ª cuenta en Bajo A (OK) y una 3ª (FALLA)
insert into auth.users (id, email, aud, role, instance_id)
values ('55555555-5555-5555-5555-555555555555','a2@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000')
on conflict do nothing;
update profiles set vivienda='Bajo A', estado='activo' where id='55555555-5555-5555-5555-555555555555';

insert into auth.users (id, email, aud, role, instance_id)
values ('66666666-6666-6666-6666-666666666666','a3@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000')
on conflict do nothing;
select assert_falla(
  $f$update profiles set vivienda='Bajo A', estado='activo' where id='66666666-6666-6666-6666-666666666666'$f$,
  'tercera cuenta en la misma vivienda');

-- ===========================================================================
-- REGRESIÓN DE LA REVISIÓN DE SEGURIDAD (SECURITY_REVIEW.md)
-- ===========================================================================

-- Fixtures extra para el finding 4 (dos encuestas, cada una con 1 pregunta y 1 opción)
reset role;
select set_config('request.jwt.claims', '', false);
insert into encuestas (id, titulo, formato, cierre, creada_por) values
  ('aaaaaaaa-0000-0000-0000-000000000001','__e1__','multi', now()+interval '5 day', :'uidP'),
  ('aaaaaaaa-0000-0000-0000-000000000002','__e2__','multi', now()+interval '5 day', :'uidP');
insert into encuesta_preguntas (id, encuesta_id, texto, tipo, orden) values
  ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','E1 q','opcion_multiple',1),
  ('cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','E2 q','opcion_multiple',1);
insert into encuesta_opciones (id, pregunta_id, texto, orden) values
  ('bbbbbbbb-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','E1 opt',1),
  ('bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002','E2 opt',1);

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);

-- 17) SUSPENDIDA 2026-09-06 (CESIONES_ACTIVAS=false en ParkingPage.tsx, mig.
-- 0059): la Parte 2 de specs/08 (cedo/no la necesito/necesito + demanda +
-- reasignación) está apagada también en servidor — `revoke insert, update on
-- parking_cesiones from authenticated`. Antes este bloque afirmaba (MEDIO 2,
-- SECURITY_REVIEW.md) que un vecino no puede AUTO-REASIGNAR su propia
-- cesión; ahora, con el revoke, un vecino no puede ni siquiera CREAR una
-- (mucho menos reasignarla) — y tampoco puede la gestión, porque el revoke
-- es sobre el rol de BD `authenticated`, común a todo usuario logueado
-- (vecino o presidente, aquí uidP). `select` sigue permitido a los activos;
-- `anon` sigue sin ningún grant (nunca lo tuvo).
--
-- AL REACTIVAR (revertir 0059 + CESIONES_ACTIVAS=true, revisando ANTES
-- 70-impact-2.md §9): este bloque debe volver a su forma original —
--   insert como uidA (debe funcionar) y luego
--   assert_falla del update a 'reasignada' (MEDIO 2 sigue vigente entonces:
--   el dueño puede cancelar su cesión pero no auto-reasignarla, ver
--   ces_upd_own).

-- 17a) Un vecino activo NO puede insertar una cesión (revoke insert).
select assert_falla(
  $f$insert into parking_cesiones (vivienda, tipo, desde, hasta, estado)
    values ('Bajo A', 'cede', current_date, current_date + 5, 'activa')$f$,
  'SUSPENDIDA: vecino no puede insertar cesión (revoke insert authenticated)');

-- Fixture con privilegios elevados (bypassa el revoke) para poder probar el
-- update por separado: sin esto no habría ninguna fila sobre la que intentar
-- actualizar (el insert de arriba, correctamente, no llegó a crear nada).
reset role;
select set_config('request.jwt.claims', '', false);
insert into parking_cesiones (vivienda, tipo, desde, hasta, estado)
  values ('Bajo A', 'cede', current_date, current_date + 5, 'activa');

-- 17b) Ese mismo vecino NO puede actualizarla (ni cancelarla, ni
-- reasignarla, ni nada): revoke update, un nivel por debajo de la policy.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);
select assert_falla(
  $f$update parking_cesiones set estado='reasignada', reasignada_a='3º C Dcha' where vivienda='Bajo A'$f$,
  'SUSPENDIDA: vecino no puede actualizar cesión, ni auto-reasignarla (revoke update authenticated)');

-- 17c) La gestión TAMPOCO puede escribir: ni insertar...
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);
select assert_falla(
  $f$insert into parking_cesiones (vivienda, tipo, desde, hasta, estado)
    values ('2º A Dcha', 'necesita', current_date, current_date + 5, 'activa')$f$,
  'SUSPENDIDA: gestión tampoco puede insertar cesión (el revoke es sobre el rol authenticated)');
-- ...ni reasignar (la acción propia de gestión, policy ces_upd_gestion,
-- queda igualmente bloqueada por el revoke, un nivel por debajo de la RLS).
select assert_falla(
  $f$update parking_cesiones set estado='reasignada', reasignada_a='3º C Dcha' where vivienda='Bajo A'$f$,
  'SUSPENDIDA: gestión tampoco puede reasignar un hueco (revoke update authenticated)');

-- 17d) select SÍ sigue permitido a un activo (no se bloquea la lectura).
select assert_min((select count(*) from parking_cesiones where vivienda = 'Bajo A'), 1,
  'SUSPENDIDA: select en parking_cesiones sigue permitido a un vecino activo');

-- 17e) anon sigue sin ningún grant sobre esta tabla (sin cambios: nunca lo tuvo).
reset role;
set role anon;
select set_config('request.jwt.claims', json_build_object('role','anon')::text, false);
select assert_falla($f$select count(*) from parking_cesiones$f$,
  'SUSPENDIDA: anon sigue sin grant en parking_cesiones (sin cambios)');

-- Restaura el contexto esperado por el resto de la suite (vecino A, authenticated).
reset role;
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);

-- 18) BAJO 4: no se puede votar en una pregunta con una opción de OTRA pregunta
select assert_falla(
  format($f$insert into encuesta_votos (pregunta_id, vivienda, opcion_id, emitido_por)
    values ('cccccccc-0000-0000-0000-000000000001','Bajo A','bbbbbbbb-0000-0000-0000-000000000002','%s')$f$, :'uidA'),
  'BAJO4: voto con opción de otra pregunta');

-- ===========================================================================
-- MENSAJERÍA: mensajes públicos (solo gestión publica) + buzón privado
-- ===========================================================================
-- vecino A NO puede publicar un mensaje público
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);
select assert_falla(
  $f$insert into mensajes (tipo, titulo, cuerpo) values ('aviso','__msg A__','x')$f$,
  'MSG: vecino NO publica mensajes');

-- vecino A abre un hilo privado en el buzón, dirigido a Presidencia
insert into hilos (id, vecino_id, asunto, canal) values ('88888888-0000-0000-0000-000000000001', :'uidA', '__buzon A__', 'presidencia');
insert into hilo_mensajes (hilo_id, texto) values ('88888888-0000-0000-0000-000000000001','hola presidencia');
select assert_igual((select count(*) from hilos where asunto='__buzon A__'), 1, 'BUZON: vecino A ve su hilo');

-- vecino B NO ve el hilo de A (privacidad de canal)
select set_config('request.jwt.claims', json_build_object('sub',:'uidB','role','authenticated')::text, false);
select assert_igual((select count(*) from hilos where asunto='__buzon A__'), 0, 'BUZON: vecino B NO ve el hilo de A');

-- presidente SÍ publica mensaje y SÍ ve el hilo (canal presidencia)
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);
insert into mensajes (tipo, titulo, cuerpo, created_by) values ('aviso','__msg pres__','contenido', auth.uid());
select assert_igual((select count(*) from mensajes where titulo='__msg pres__'), 1, 'MSG: presidente SÍ publica');
select assert_igual((select count(*) from hilos where asunto='__buzon A__'), 1, 'BUZON: presidencia ve el hilo del vecino');

-- app_admin (uidX) NO ve el hilo de Presidencia (privacidad estricta)
select set_config('request.jwt.claims', json_build_object('sub',:'uidX','role','authenticated')::text, false);
select assert_igual((select count(*) from hilos where asunto='__buzon A__'), 0, 'BUZON: app_admin NO husmea el canal Presidencia');

-- ===========================================================================
-- PUBLICACIONES DE VECINOS + LIKES (migraciones 0028-0034)
-- ===========================================================================
-- vecino A: NO puede publicar directo al tablón, SÍ enviar pendiente
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);
select assert_falla(
  $f$insert into mensajes (tipo, titulo, cuerpo, destino, estado, created_by) values ('sugerencia','__sug A__','x','todos','publicado', auth.uid())$f$,
  'PUB: vecino NO publica directo (estado=publicado)');
insert into mensajes (id, tipo, titulo, cuerpo, destino, estado, created_by)
  values ('99999999-aaaa-0000-0000-000000000001','sugerencia','__sug A__','quiero 3 presupuestos','todos','pendiente', auth.uid());
select assert_igual((select count(*) from mensajes where titulo='__sug A__'), 1, 'PUB: vecino SÍ envía pendiente');
-- una vez ENVIADA a aprobar (pendiente), el autor NO se auto-aprueba ni la edita
-- (0035; la RLS filtra el UPDATE en silencio → 0 filas, sin excepción).
update mensajes set estado='publicado' where id='99999999-aaaa-0000-0000-000000000001';
select assert_igual((select count(*) from mensajes where id='99999999-aaaa-0000-0000-000000000001' and estado='pendiente'), 1, 'PUB: vecino NO se auto-aprueba');
update mensajes set titulo='__sug A EDIT__' where id='99999999-aaaa-0000-0000-000000000001';
select assert_igual((select count(*) from mensajes where titulo='__sug A EDIT__'), 0, 'PUB: autor NO edita una pendiente');
-- vecino A: NO puede cambiar su propio rol/estado (grants por columna, 0028)
select assert_falla(
  $f$update profiles set rol='app_admin' where id=auth.uid()$f$,
  'PROFILES: vecino NO se cambia el rol');
select assert_falla(
  $f$update profiles set estado='activo' where id=auth.uid()$f$,
  'PROFILES: vecino NO toca su estado');

-- presidente (moderador) aprueba la sugerencia
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);
update mensajes set estado='publicado', publica_at=now() where id='99999999-aaaa-0000-0000-000000000001';
select assert_igual((select count(*) from mensajes where titulo='__sug A__' and estado='publicado'), 1, 'PUB: moderador aprueba');

-- vecino B da like (su vivienda es piso); el doble like falla (PK por vivienda)
select set_config('request.jwt.claims', json_build_object('sub',:'uidB','role','authenticated')::text, false);
insert into mensaje_likes (mensaje_id, vivienda) values ('99999999-aaaa-0000-0000-000000000001','1º A Dcha');
select assert_igual((select count(*) from mensaje_likes where mensaje_id='99999999-aaaa-0000-0000-000000000001'), 1, 'LIKE: vecino B da like');
select assert_falla(
  $f$insert into mensaje_likes (mensaje_id, vivienda) values ('99999999-aaaa-0000-0000-000000000001','1º A Dcha')$f$,
  'LIKE: doble like de la misma vivienda falla');
-- vecino B: NO puede dar like a nombre de otra vivienda
select assert_falla(
  $f$insert into mensaje_likes (mensaje_id, vivienda) values ('99999999-aaaa-0000-0000-000000000001','Bajo A')$f$,
  'LIKE: no se puede dar like por otra vivienda');

-- la 2ª cuenta de la MISMA vivienda (uidC) puede QUITAR el like (like es de la vivienda)
select set_config('request.jwt.claims', json_build_object('sub',:'uidC','role','authenticated')::text, false);
delete from mensaje_likes where mensaje_id='99999999-aaaa-0000-0000-000000000001' and vivienda='1º A Dcha';
select assert_igual((select count(*) from mensaje_likes where mensaje_id='99999999-aaaa-0000-0000-000000000001'), 0, 'LIKE: la otra cuenta de la vivienda lo quita');

-- vecino A: NO puede borrar su sugerencia ya PUBLICADA (delete silencioso → sigue viva)
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);
delete from mensajes where id='99999999-aaaa-0000-0000-000000000001';
select assert_igual((select count(*) from mensajes where titulo='__sug A__'), 1, 'PUB: autor NO borra lo publicado');

-- tester: solo lectura también en mensajes y likes
select set_config('request.jwt.claims', json_build_object('sub',:'uidT','role','authenticated')::text, false);
select assert_falla(
  $f$insert into mensajes (tipo, titulo, cuerpo, destino, estado, created_by) values ('incidencia','__msg tester__','x','todos','pendiente', auth.uid())$f$,
  'TESTER: no envía publicaciones');
select assert_falla(
  $f$insert into mensaje_likes (mensaje_id, vivienda) values ('99999999-aaaa-0000-0000-000000000001','Bajo B')$f$,
  'TESTER: no da likes');

-- ===========================================================================
-- TESTS COMO CONSERJE (visibilidad del tablón por tipo + reservas es_piso)
-- ===========================================================================
select set_config('request.jwt.claims', json_build_object('sub',:'uidK','role','authenticated')::text, false);

-- CONSERJE: ve avisos (ver_aviso) pero NO anuncios (no tiene ver_anuncio)
select assert_igual((select count(*) from mensajes where titulo='__aviso fix__'), 1, 'TIPO: conserje SÍ ve avisos');
select assert_igual((select count(*) from mensajes where titulo='__anuncio fix__'), 0, 'TIPO: conserje NO ve anuncios');

-- CONSERJE: puede publicar un aviso (publicar_aviso) pero NO un anuncio
insert into mensajes (tipo, titulo, cuerpo, destino, estado, created_by)
  values ('aviso','__aviso conserje__','x','todos','publicado', auth.uid());
delete from mensajes where titulo='__aviso conserje__';
select assert_falla(
  $f$insert into mensajes (tipo, titulo, cuerpo, destino, estado, created_by) values ('anuncio','__anuncio conserje__','x','todos','publicado', auth.uid())$f$,
  'TIPO: conserje NO publica anuncios');

-- CONSERJE (reservar_otras_viviendas): NO puede reservar para una vivienda
-- ESPECIAL (no es_piso) — regresión es_piso corregida en 0045.
select assert_falla(
  format($f$insert into reservas (zona_id, vivienda, solicitada_por, inicio, fin)
    select id, 'Tester', '%s', date_trunc('day', now()+interval '13 day')+interval '10 hour',
    date_trunc('day', now()+interval '13 day')+interval '12 hour' from zonas_comunes where nombre='Jardín'$f$, :'uidK'),
  'RESERVA: no se reserva a nombre de vivienda especial (es_piso)');

reset role;

-- ---------------------------------------------------------------------------
-- _health (0055): el keep-alive pinga esta tabla con la clave anon, así que
-- anon DEBE poder leerla; y no debe poder escribirla (solo hay policy SELECT).
-- ---------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claims', json_build_object('role','anon')::text, false);

select assert_igual((select count(*) from _health), 1::bigint,
  'HEALTH: anon lee _health (keep-alive del workflow)');

select assert_falla(
  $f$insert into _health (id) values (99)$f$,
  'HEALTH: anon NO escribe en _health');

reset role;

-- ===========================================================================
-- CAL (mig. 0056 · specs/21-modulo-calendario.md § Seguridad y tests): la
-- tabla NO existe hasta que el implementer aplique 0056 → este bloque entero
-- falla en rojo (relation "calendario_eventos" does not exist) hasta entonces;
-- es el rojo esperado de TDD. Fixtures: uidJ (junta, permiso por defecto) y
-- uidZ (creador desechable) declarados y creados arriba, junto al resto.
-- ===========================================================================

-- 1) vecino A lee festivos sembrados (>=1) y NO inserta
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);
select assert_min((select count(*) from calendario_eventos where tipo='festivo'), 1, 'CAL: vecino A lee festivos sembrados');
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha) values ('comunidad','__cal A__', current_date)$f$,
  'CAL: vecino A no inserta');

-- 1b) costura (§7.17, C21): profiles.estado = suspendido → 0 filas (es_activo
--     le cierra la lectura); se restaura al final para no afectar al resto del
--     archivo (este es el ÚLTIMO bloque que usa a A).
reset role;
update profiles set estado='suspendido' where id=:'uidA';
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);
select assert_igual((select count(*) from calendario_eventos), 0, 'CAL: cuenta suspendida no lee nada del calendario (es_activo)');
reset role;
update profiles set estado='activo' where id=:'uidA'; -- restaurar

-- 2) presidente P inserta, edita y borra (tiene el permiso por defecto)
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);
insert into calendario_eventos (tipo, titulo, fecha, created_by)
  values ('comunidad','__cal P__', current_date + 5, auth.uid());
select assert_igual((select count(*) from calendario_eventos where titulo='__cal P__' and created_by=:'uidP'), 1, 'CAL: presidente inserta con created_by = su uuid');
update calendario_eventos set nota='editado por P' where titulo='__cal P__';
select assert_igual((select count(*) from calendario_eventos where titulo='__cal P__' and nota='editado por P'), 1, 'CAL: presidente edita');
delete from calendario_eventos where titulo='__cal P__';
select assert_igual((select count(*) from calendario_eventos where titulo='__cal P__'), 0, 'CAL: presidente borra');

-- 3) tester T NO inserta aunque se le conceda el permiso (es_tester() manda)
reset role;
insert into role_permissions (rol, permiso) values ('tester','gestionar_calendario') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidT','role','authenticated')::text, false);
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha) values ('comunidad','__cal T__', current_date)$f$,
  'CAL: tester no inserta aunque tenga el permiso concedido');
reset role;
delete from role_permissions where rol='tester' and permiso='gestionar_calendario'; -- revocar (dejar como estaba)

-- 4) anon NO lee (sin grant)
set role anon;
select set_config('request.jwt.claims', json_build_object('role','anon')::text, false);
select assert_falla($f$select count(*) from calendario_eventos$f$, 'CAL: anon no lee calendario');
reset role;

-- 5) junta J inserta con el permiso por defecto; al quitarle el permiso EN VIVO
--    deja de insertar/editar (incluso lo que creó); se restaura al final.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidJ','role','authenticated')::text, false);
insert into calendario_eventos (tipo, titulo, fecha, created_by)
  values ('comunidad','__cal J__', current_date + 6, auth.uid());
select assert_igual((select count(*) from calendario_eventos where titulo='__cal J__'), 1, 'CAL: junta inserta con el permiso por defecto');
reset role;
delete from role_permissions where rol='junta' and permiso='gestionar_calendario';
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidJ','role','authenticated')::text, false);
-- el UPDATE con USING falso no lanza excepción: simplemente afecta 0 filas.
update calendario_eventos set nota='no debería poder' where titulo='__cal J__';
select assert_igual((select count(*) from calendario_eventos where titulo='__cal J__' and nota is not null), 0, 'CAL: junta sin permiso no edita ni lo que creó (0 filas afectadas)');
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha) values ('comunidad','__cal J2__', current_date)$f$,
  'CAL: junta sin permiso no inserta');
reset role;
select assert_igual((select count(*) from calendario_eventos where titulo='__cal J__'), 1, 'CAL: el evento de junta se conserva tras quitarle el permiso');
insert into role_permissions (rol, permiso) values ('junta','gestionar_calendario') on conflict do nothing; -- restaurar

-- 6) constraints (como presidente P, que conserva el permiso)
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha, fecha_fin, created_by) values ('comunidad','__cal fin__', current_date, current_date - 1, auth.uid())$f$,
  'CAL: constraint fecha_fin < fecha');
select assert_falla(
  format($f$insert into calendario_eventos (tipo, titulo, fecha, created_by) values ('comunidad','%s', current_date, '%s')$f$, repeat('a',101), :'uidP'),
  'CAL: constraint título de 101 caracteres');
select assert_falla(
  format($f$insert into calendario_eventos (tipo, titulo, fecha, nota, created_by) values ('comunidad','__cal nota__', current_date, '%s', '%s')$f$, repeat('a',501), :'uidP'),
  'CAL: constraint nota de 501 caracteres');
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha, created_by) values ('comunidad','__cal antiguo__', date '2019-12-31', auth.uid())$f$,
  'CAL: constraint fecha < 2020-01-01');
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha, fecha_fin, created_by) values ('comunidad','__cal rango__', date '2026-01-01', date '2027-01-03', auth.uid())$f$,
  'CAL: constraint rango de 367 días (>366)');

-- C25) festivo manual: mismo (fecha,título) que uno ya sembrado → falla por el
--     índice único parcial; con otra fecha → se crea y guarda su fuente.
select assert_falla(
  $f$insert into calendario_eventos (tipo, titulo, fecha, created_by) values ('festivo','Fiesta Nacional de España', date '2026-10-12', auth.uid())$f$,
  'CAL: festivo duplicado (fecha,título) viola el índice único parcial');
insert into calendario_eventos (tipo, titulo, fecha, fuente, created_by)
  values ('festivo','__cal festivo manual__', date '2027-10-12', '__cal fuente manual__', auth.uid());
select assert_igual((select count(*) from calendario_eventos where titulo='__cal festivo manual__' and fuente='__cal fuente manual__'), 1, 'CAL: festivo manual con otra fecha se crea y guarda su fuente');
delete from calendario_eventos where titulo='__cal festivo manual__'; -- no contaminar el recuento de "14 festivos sembrados" (test 7)
reset role;

-- 7) seed idempotente: reinsertar los 14 festivos 2026 → 0 filas nuevas
--    (copia literal del seed de 0056; único parcial (fecha,titulo) where tipo='festivo')
-- FIX (pre-existente, sin relación con este evolutivo): el recuento estaba
-- fijado en 14 desde 0056, pero la migración 0058 (festivos NACIONALES de
-- 2027, ya fusionada) siembra 9 filas MÁS de tipo 'festivo' de forma
-- permanente → 14 + 9 = 23 en cualquier BD con las migraciones aplicadas
-- hasta 0058. El literal `14` llevaba roto desde que se fusionó 0058 (bloquea
-- el barrido completo de la suite); se corrige aquí de paso, sin tocar nada
-- de calendario/festivos en sí.
select assert_igual((select count(*) from calendario_eventos where tipo='festivo'), 23, 'CAL: 23 festivos sembrados antes de reinsertar (14 de 2026 + 9 nacionales de 2027, mig. 0058)');
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
select assert_igual((select count(*) from calendario_eventos where tipo='festivo'), 23, 'CAL: seed idempotente, 0 filas nuevas tras reinsertar (23 = 14 + 9 de 0058)');

-- 8) borrar la cuenta creadora (Z) → el evento se conserva con created_by null;
--    verificador de huérfanos = 0 (§7.17)
insert into calendario_eventos (tipo, titulo, fecha, created_by) values ('comunidad','__cal Z__', current_date + 3, :'uidZ');
select assert_igual((select count(*) from calendario_eventos where titulo='__cal Z__' and created_by=:'uidZ'), 1, 'CAL: evento de Z antes de borrar su cuenta');
delete from auth.users where id = :'uidZ';
select assert_igual((select count(*) from calendario_eventos where titulo='__cal Z__' and created_by is null), 1, 'CAL: al eliminar la cuenta creadora, el evento se conserva con created_by null');
select assert_igual((select count(*) from calendario_eventos e
  left join profiles p on p.id = e.created_by
  where e.created_by is not null and p.id is null), 0, 'CAL: sin created_by huérfanos');

-- 9) purga automática de festivos pasados (mig. 0057, decisión del usuario
--    2026-09-06): un festivo ya pasado se borra solo; un evento de comunidad
--    pasado se conserva. purgar_festivos_pasados() borra TODO festivo pasado
--    de la tabla (no solo el fixture de abajo), incluidos los 14 sembrados
--    por 0056 si ya hubiera pasado alguno; por eso este bloque va en su
--    PROPIA transacción con ROLLBACK: verifica el comportamiento real de la
--    función sin dejar la tabla en un estado distinto al que tenía antes
--    (el test 7 de arriba asume los 14 festivos sembrados intactos en cada
--    pasada de este archivo).
begin;
insert into calendario_eventos (tipo, titulo, fecha) values ('festivo','__cal viejo__', current_date - 5);
insert into calendario_eventos (tipo, titulo, fecha) values ('comunidad','__cal viejo com__', current_date - 5);
select assert_igual((select count(*) from calendario_eventos where titulo in ('__cal viejo__','__cal viejo com__')), 2, 'CAL: purga - fixtures creadas antes de purgar');
select purgar_festivos_pasados();
select assert_igual((select count(*) from calendario_eventos where titulo='__cal viejo__'), 0, 'CAL: purgar_festivos_pasados() borra el festivo ya pasado');
select assert_igual((select count(*) from calendario_eventos where titulo='__cal viejo com__'), 1, 'CAL: purgar_festivos_pasados() conserva el evento de comunidad pasado');
rollback;
-- Limpieza idempotente (defensiva, por si algún día este bloque se ejecuta
-- fuera de la transacción de arriba): no debe quedar ningún fixture suelto.
delete from calendario_eventos where titulo in ('__cal viejo__','__cal viejo com__');

reset role;
select '════════════════════════════════════════' as _;
select '✅ TODOS LOS TESTS DE RLS PASARON' as resultado;
