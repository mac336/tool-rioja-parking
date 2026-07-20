-- 0052 · Encuestas de tipo JUNTA (asistencia + votos reales/sondeo)
-- ---------------------------------------------------------------------------
-- Una encuesta de junta reutiliza encuestas/preguntas/opciones/votos: cada
-- "punto" es una pregunta con dos opciones ("Aprobar"/"Rechazar"). Además cada
-- vivienda declara si ASISTE a la junta y si quiere VOTAR por la app. Un voto es
-- REAL sii (asiste=false y vota_app=true); en cualquier otro caso es SONDEO.
--
-- Visibilidad:
--  · General (todos los activos, EN VIVO, anónimo): por punto, aprobar/rechazar
--    sumando sondeo + reales.
--  · Detalle REAL por piso (solo administrador de finca + app_admin): qué votó
--    cada piso que es votante real, para trasladarlo en la junta.

alter table encuestas add column if not exists es_junta boolean not null default false;

create table if not exists junta_participacion (
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  vivienda text not null references viviendas(codigo),
  asiste boolean not null default false,
  vota_app boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (encuesta_id, vivienda)
);
alter table junta_participacion enable row level security;
alter table junta_participacion force row level security;
grant select, insert, update, delete on junta_participacion to authenticated;

-- ¿El que consulta es administrador de finca o app_admin? (para el detalle real)
create or replace function es_admin_finca_o_app() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and estado = 'activo' and rol in ('administrador_finca','app_admin')
  );
$$;
grant execute on function es_admin_finca_o_app() to authenticated;

-- RLS: cada vecino ve/gestiona SU participación; el admin (finca/app) ve todas.
drop policy if exists jp_sel on junta_participacion;
create policy jp_sel on junta_participacion for select
  using (vivienda = mi_vivienda() or es_admin_finca_o_app());
drop policy if exists jp_ins on junta_participacion;
create policy jp_ins on junta_participacion for insert
  with check (vivienda = mi_vivienda() and es_activo() and not es_tester());
drop policy if exists jp_upd on junta_participacion;
create policy jp_upd on junta_participacion for update
  using (vivienda = mi_vivienda() and es_activo() and not es_tester())
  with check (vivienda = mi_vivienda());

-- Resultados GENERALES (todos los activos, EN VIVO, anónimos): por punto,
-- aprobar/rechazar sumando sondeo + reales.
create or replace function junta_resultados(p_encuesta uuid)
  returns table(punto_id uuid, punto_texto text, orden int, aprobar bigint, rechazar bigint)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not es_activo() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select pr.id, pr.texto, pr.orden,
      count(v.id) filter (where lower(o.texto) = 'aprobar')::bigint,
      count(v.id) filter (where lower(o.texto) = 'rechazar')::bigint
    from encuesta_preguntas pr
    left join encuesta_opciones o on o.pregunta_id = pr.id
    left join encuesta_votos v on v.opcion_id = o.id
    where pr.encuesta_id = p_encuesta
    group by pr.id, pr.texto, pr.orden
    order by pr.orden;
end; $$;
grant execute on function junta_resultados(uuid) to authenticated;

-- Detalle REAL por piso (solo administrador de finca + app_admin, EN VIVO):
-- qué votó cada piso que es votante REAL (no asiste y vota por app).
create or replace function junta_detalle_real(p_encuesta uuid)
  returns table(vivienda text, punto_id uuid, punto_texto text, orden int, voto text)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin_finca_o_app() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select jp.vivienda, pr.id, pr.texto, pr.orden, o.texto
    from junta_participacion jp
    join encuesta_preguntas pr on pr.encuesta_id = jp.encuesta_id
    join encuesta_votos v on v.pregunta_id = pr.id and v.vivienda = jp.vivienda
    join encuesta_opciones o on o.id = v.opcion_id
    where jp.encuesta_id = p_encuesta and jp.asiste = false and jp.vota_app = true
    order by jp.vivienda, pr.orden;
end; $$;
grant execute on function junta_detalle_real(uuid) to authenticated;

-- Participantes (solo admin finca/app): por vivienda, asistencia y si su voto es real.
create or replace function junta_participantes(p_encuesta uuid)
  returns table(vivienda text, asiste boolean, vota_app boolean, es_real boolean)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin_finca_o_app() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select jp.vivienda, jp.asiste, jp.vota_app, (jp.asiste = false and jp.vota_app = true)
    from junta_participacion jp
    where jp.encuesta_id = p_encuesta
    order by jp.vivienda;
end; $$;
grant execute on function junta_participantes(uuid) to authenticated;
