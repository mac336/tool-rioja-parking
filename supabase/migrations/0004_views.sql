-- ============================================================================
-- Rioja 25 · Vistas y funciones de lectura curada
-- (bypassan RLS de la tabla base pero exponen solo lo permitido, con guard
--  es_activo() para que un no-activo no obtenga filas)
-- ============================================================================

-- Directorio de vecinos: nombre, vivienda y rol (SIN email). Solo activos.
create or replace view directorio as
  select id, nombre, vivienda, rol
  from profiles
  where estado = 'activo' and es_activo();
grant select on directorio to authenticated;

-- Ocupación de reservas SIN identidad del solicitante (para el calendario del
-- vecino). Solo franjas vigentes pendientes/aprobadas. Ver specs/07.
create or replace view ocupacion_reservas as
  select zona_id, inicio, fin, estado
  from reservas
  where estado in ('pendiente','aprobada') and fin >= now() and es_activo();
grant select on ocupacion_reservas to authenticated;

-- Participación de una encuesta: nº de viviendas que han votado (sin desglose
-- por opción). Visible durante la votación para el "X de Y".
-- Participación de una encuesta: nº de viviendas que han votado (en cualquier
-- pregunta), sin desglose por opción. Para el "X de Y" durante la votación.
create or replace view encuesta_participacion as
  select p.encuesta_id, count(distinct v.vivienda) as viviendas_votantes
  from encuesta_votos v
  join encuesta_preguntas p on p.id = v.pregunta_id
  where es_activo()
  group by p.encuesta_id;
grant select on encuesta_participacion to authenticated;

-- Resultados por PREGUNTA y opción: SOLO si la encuesta está cerrada o el que
-- consulta es gestión (evita influir en el voto en curso). Cómputo en BD.
create or replace function encuesta_resultados(p_encuesta uuid)
  returns table(pregunta_id uuid, pregunta_texto text, opcion_id uuid, opcion_texto text, votos bigint)
  language plpgsql stable security definer set search_path = public as $$
declare v_cerrada boolean;
begin
  if not es_activo() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  select (cierre <= now()) into v_cerrada from encuestas where id = p_encuesta;
  if not coalesce(v_cerrada, false) and not es_gestion() then
    raise exception 'Los resultados por opción solo se ven al cerrar la encuesta.'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select pr.id, pr.texto, o.id, o.texto, count(v.id) as votos
    from encuesta_preguntas pr
    join encuesta_opciones o on o.pregunta_id = pr.id
    left join encuesta_votos v on v.opcion_id = o.id
    where pr.encuesta_id = p_encuesta
    group by pr.id, pr.texto, pr.orden, o.id, o.texto, o.orden
    order by pr.orden, o.orden;
end; $$;
grant execute on function encuesta_resultados(uuid) to authenticated;
