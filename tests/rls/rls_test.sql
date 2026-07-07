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

-- ---------------------------------------------------------------------------
-- Fixtures (como postgres): 2 vecinos + 1 presidente + 1 app_admin
-- ---------------------------------------------------------------------------
\set uidA '11111111-1111-1111-1111-111111111111'
\set uidB '22222222-2222-2222-2222-222222222222'
\set uidP '33333333-3333-3333-3333-333333333333'
\set uidX '44444444-4444-4444-4444-444444444444'

-- Limpieza idempotente: borrar datos dependientes de runs previos antes de los
-- usuarios de prueba (evita fallos de FK al re-ejecutar sin reset).
delete from encuesta_votos where emitido_por in (:'uidA',:'uidB',:'uidP',:'uidX');
delete from reservas where solicitada_por in (:'uidA',:'uidB',:'uidP',:'uidX');
delete from incidencias where autor_id in (:'uidA',:'uidB',:'uidP',:'uidX');
delete from anuncios where autor_id in (:'uidA',:'uidB',:'uidP',:'uidX');
delete from parking_cesiones where vivienda in ('Bajo A','1º A Dcha','2º A Dcha','3º A Dcha');
delete from encuesta_opciones where encuesta_id in (select id from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__'));
delete from encuestas where titulo in ('__test__','__test2__','__e1__','__e2__');
delete from auth.users where id in (
  :'uidA',:'uidB',:'uidP',:'uidX',
  '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666');

insert into auth.users (id, email, aud, role, instance_id)
values
  (:'uidA','a@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidB','b@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidP','p@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000'),
  (:'uidX','x@test.local','authenticated','authenticated','00000000-0000-0000-0000-000000000000');

-- handle_new_user creó perfiles 'pendiente'; los activamos con vivienda/rol.
update profiles set vivienda='Bajo A',   rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidA';
update profiles set vivienda='1º A Dcha', rol='vecino',     estado='activo', normas_aceptadas_at=now() where id=:'uidB';
update profiles set vivienda='2º A Dcha', rol='presidente', estado='activo', normas_aceptadas_at=now() where id=:'uidP';
update profiles set vivienda='3º A Dcha', rol='app_admin',  estado='activo', normas_aceptadas_at=now() where id=:'uidX';

-- Encuesta abierta con 2 opciones + zona para reservas.
delete from encuestas where titulo='__test__';
with e as (
  insert into encuestas (titulo, tipo, apertura, cierre, creada_por)
  values ('__test__','opcion_unica', now()-interval '1 day', now()+interval '7 days', :'uidP')
  returning id
)
insert into encuesta_opciones (encuesta_id, texto, orden)
select id, 'Opción 1', 1 from e union all select id, 'Opción 2', 2 from e;

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
select assert_igual((select count(*) from directorio), 4, 'vecino A ve directorio de activos');

-- 4) A NO puede leer audit_log (0 filas por RLS)
select assert_igual((select count(*) from audit_log), 0, 'vecino A no lee audit_log');

-- 5) A vota una vez → OK; segundo voto (opción distinta, opción_única) → FALLA
insert into encuesta_votos (encuesta_id, vivienda, opcion_id, emitido_por)
select e.id, 'Bajo A', o.id, :'uidA'
from encuestas e join encuesta_opciones o on o.encuesta_id=e.id
where e.titulo='__test__' and o.orden=1;
select assert_falla(
  format($f$insert into encuesta_votos (encuesta_id, vivienda, opcion_id, emitido_por)
    select e.id, 'Bajo A', o.id, '%s' from encuestas e join encuesta_opciones o on o.encuesta_id=e.id
    where e.titulo='__test__' and o.orden=2$f$, :'uidA'),
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

-- 11) B sí ve la OCUPACIÓN (sin identidad) de esa franja
select assert_igual((select count(*) from ocupacion_reservas), 1, 'vecino B ve ocupación sin identidad');

-- ===========================================================================
-- TESTS COMO PRESIDENTE (aprobar reserva)
-- ===========================================================================
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);

-- 12) Presidente ve la reserva de A (gestión) y la aprueba → OK
select assert_igual((select count(*) from reservas where vivienda='Bajo A'), 1, 'presidente ve reserva de A');
update reservas set estado='aprobada', aprobada_por=:'uidP' where vivienda='Bajo A';
select assert_igual((select count(*) from reservas where vivienda='Bajo A' and estado='aprobada'), 1, 'presidente aprueba reserva');

-- 13) Presidente crea una encuesta → OK (es gestión)
insert into encuestas (titulo, tipo, cierre, creada_por)
values ('__test2__','opcion_unica', now()+interval '3 day', :'uidP');
select assert_igual((select count(*) from encuestas where titulo='__test2__'), 1, 'presidente crea encuesta');

-- ===========================================================================
-- TESTS COMO ANÓNIMO
-- ===========================================================================
reset role;
set role anon;
select set_config('request.jwt.claims', json_build_object('role','anon')::text, false);

-- 14) Anónimo lee el catálogo de viviendas (necesario para el formulario público)
select assert_igual((select count(*) from viviendas), 41, 'anónimo lee viviendas');

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
-- TEST anti-spam incidencias: 5/día OK, 6ª FALLA
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidB','role','authenticated')::text, false);
insert into incidencias (titulo, descripcion) select 'inc '||g, 'desc' from generate_series(1,5) g;
select assert_falla(
  $f$insert into incidencias (titulo, descripcion) values ('inc 6','desc')$f$,
  'sexta incidencia del día por vivienda');

-- ===========================================================================
-- REGRESIÓN DE LA REVISIÓN DE SEGURIDAD (SECURITY_REVIEW.md)
-- ===========================================================================

-- Fixtures extra para el finding 4 (dos encuestas con una opción cada una)
reset role;
select set_config('request.jwt.claims', '', false);
insert into encuestas (id, titulo, tipo, cierre, creada_por) values
  ('aaaaaaaa-0000-0000-0000-000000000001','__e1__','opcion_multiple', now()+interval '5 day', :'uidP'),
  ('aaaaaaaa-0000-0000-0000-000000000002','__e2__','opcion_multiple', now()+interval '5 day', :'uidP');
insert into encuesta_opciones (id, encuesta_id, texto, orden) values
  ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','E1 opt',1),
  ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','E2 opt',1);

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',:'uidA','role','authenticated')::text, false);

-- 16) CRÍTICO 1: un vecino inserta un anuncio 'publicado'/'principal' → el trigger
--     lo fuerza a 'pendiente' con nivel null (NO se autopublica).
insert into anuncios (titulo, cuerpo, fecha_inicio, fecha_fin, nivel_solicitado, nivel, estado, publicado_at)
  values ('__hack pub', 'texto', current_date, current_date + 30, 'principal', 'principal', 'publicado', now());
select assert_igual(
  (select count(*) from anuncios where titulo='__hack pub' and estado='pendiente' and nivel is null),
  1, 'CRÍTICO1: anuncio de vecino nace PENDIENTE (no autopublicado)');

-- 17) MEDIO 2: un vecino NO puede auto-reasignar su cesión de parking
insert into parking_cesiones (vivienda, tipo, desde, hasta, estado)
  values ('Bajo A', 'cede', current_date, current_date + 5, 'activa');
select assert_falla(
  $f$update parking_cesiones set estado='reasignada', reasignada_a='3º C Dcha' where vivienda='Bajo A'$f$,
  'MEDIO2: vecino auto-reasigna su cesión de parking');

-- 18) MEDIO 3: el autor NO puede cambiar el estado/moderación de su incidencia
--     (el guard lo revierte silenciosamente → sigue 'abierta' y sin bloquear).
insert into incidencias (titulo, descripcion) values ('__inc guard', 'x');
update incidencias set estado='resuelta', comentarios_bloqueados=true where titulo='__inc guard';
select assert_igual(
  (select count(*) from incidencias where titulo='__inc guard' and estado='abierta' and not comentarios_bloqueados),
  1, 'MEDIO3: autor NO cambia estado/moderación de su incidencia');

-- 19) BAJO 4: no se puede votar con una opción que es de OTRA encuesta
select assert_falla(
  format($f$insert into encuesta_votos (encuesta_id, vivienda, opcion_id, emitido_por)
    values ('aaaaaaaa-0000-0000-0000-000000000001','Bajo A','bbbbbbbb-0000-0000-0000-000000000002','%s')$f$, :'uidA'),
  'BAJO4: voto con opción de otra encuesta');

-- ===========================================================================
-- FUNCIONAL 5: el presidente PUEDE bloquear anuncios de una vivienda; un vecino NO
-- ===========================================================================
-- vecino A NO puede tocar el flag: su UPDATE no pasa el USING → 0 filas afectadas
-- (sin excepción), así que comprobamos que el flag sigue en true.
update viviendas set puede_publicar_anuncios=false where codigo='1º A Dcha';
select assert_igual(
  (select count(*) from viviendas where codigo='1º A Dcha' and puede_publicar_anuncios),
  1, 'FUNC5: vecino NO cambia el flag de la vivienda (sigue true)');

-- presidente SÍ puede
select set_config('request.jwt.claims', json_build_object('sub',:'uidP','role','authenticated')::text, false);
update viviendas set puede_publicar_anuncios=false where codigo='1º A Dcha';
select assert_igual(
  (select count(*) from viviendas where codigo='1º A Dcha' and not puede_publicar_anuncios),
  1, 'FUNC5: presidente SÍ bloquea anuncios de una vivienda');
-- restaurar
update viviendas set puede_publicar_anuncios=true where codigo='1º A Dcha';

reset role;
select '════════════════════════════════════════' as _;
select '✅ TODOS LOS TESTS DE RLS PASARON' as resultado;
