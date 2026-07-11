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

-- Limpieza idempotente: borrar datos dependientes de runs previos antes de los
-- usuarios de prueba (evita fallos de FK al re-ejecutar sin reset).
delete from encuesta_votos where emitido_por in (:'uidA',:'uidB',:'uidP',:'uidX',:'uidC',:'uidT');
-- borra reservas por vivienda de prueba (robusto ante datos de otros suites,
-- p. ej. el test de integración, que comparten estas viviendas).
delete from reservas where vivienda in ('Bajo A','1º A Dcha','2º A Dcha','3º A Dcha');
delete from hilos where vecino_id in (:'uidA',:'uidB',:'uidP',:'uidX',:'uidC',:'uidT');
delete from mensajes where titulo in ('__msg A__','__msg pres__','__sug A__','__msg tester__');
delete from parking_cesiones where vivienda in ('Bajo A','1º A Dcha','2º A Dcha','3º A Dcha');
delete from encuesta_opciones where pregunta_id in (select id from encuesta_preguntas where encuesta_id in (select id from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__')));
delete from encuesta_preguntas where encuesta_id in (select id from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__'));
delete from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__');
delete from auth.users where id in (
  :'uidA',:'uidB',:'uidP',:'uidX',:'uidC',:'uidT',
  '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666');

insert into auth.users (id, email, aud, role, instance_id)
values
  (:'uidA','a@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidB','b@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidP','p@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidX','x@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidC','c@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidT','t@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000');

-- handle_new_user creó perfiles 'pendiente'; los activamos con vivienda/rol.
update profiles set vivienda='Bajo A',   rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidA';
update profiles set vivienda='1º A Dcha', rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidB';
update profiles set vivienda='2º A Dcha', rol='presidente', estado='activo', normas_aceptadas_at=now() where id=:'uidP';
update profiles set vivienda='3º A Dcha', rol='app_admin',  estado='activo', normas_aceptadas_at=now() where id=:'uidX';
update profiles set vivienda='1º A Dcha', rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidC'; -- 2ª cuenta de la vivienda de B
update profiles set vivienda='Bajo B',   rol='tester',     estado='activo', normas_aceptadas_at=now() where id=:'uidT';

-- Encuesta abierta (formato única) con 1 pregunta y 2 opciones.
insert into encuestas (id, titulo, formato, apertura, cierre, creada_por)
  values ('dddddddd-0000-0000-0000-000000000001','__test__','unica', now()-interval '1 day', now()+interval '7 days', :'uidP');
insert into encuesta_preguntas (id, encuesta_id, texto, tipo, orden)
  values ('cccccccc-0000-0000-0000-000000000009','dddddddd-0000-0000-0000-000000000001','P1','opcion_unica',1);
insert into encuesta_opciones (pregunta_id, texto, orden) values
  ('cccccccc-0000-0000-0000-000000000009','Opción 1',1),
  ('cccccccc-0000-0000-0000-000000000009','Opción 2',2);

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

-- 8) A NO puede auto-aprobar su reserva (poner estado='aprobada')
select assert_falla(
  $f$update reservas set estado='aprobada' where vivienda='Bajo A'$f$,
  'vecino auto-aprueba su reserva');

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
-- TESTS COMO PRESIDENTE (aprobar reserva)
-- ===========================================================================
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);

-- 12) Presidente ve la reserva de A (gestión) y la aprueba → OK
select assert_igual((select count(*) from reservas where vivienda='Bajo A'), 1, 'presidente ve reserva de A');
update reservas set estado='aprobada', aprobada_por=:'uidP' where vivienda='Bajo A';
select assert_igual((select count(*) from reservas where vivienda='Bajo A' and estado='aprobada'), 1, 'presidente aprueba reserva');

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

-- 17) MEDIO 2: un vecino NO puede auto-reasignar su cesión de parking
insert into parking_cesiones (vivienda, tipo, desde, hasta, estado)
  values ('Bajo A', 'cede', current_date, current_date + 5, 'activa');
select assert_falla(
  $f$update parking_cesiones set estado='reasignada', reasignada_a='3º C Dcha' where vivienda='Bajo A'$f$,
  'MEDIO2: vecino auto-reasigna su cesión de parking');

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
-- vecino A: NO puede auto-aprobarse (WITH CHECK de msg_upd)
select assert_falla(
  $f$update mensajes set estado='publicado' where id='99999999-aaaa-0000-0000-000000000001'$f$,
  'PUB: vecino NO se auto-aprueba');
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

reset role;
select '════════════════════════════════════════' as _;
select '✅ TODOS LOS TESTS DE RLS PASARON' as resultado;
