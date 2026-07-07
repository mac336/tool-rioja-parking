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
create or replace view encuesta_participacion as
  select encuesta_id, count(distinct vivienda) as viviendas_votantes
  from encuesta_votos
  where es_activo()
  group by encuesta_id;
grant select on encuesta_participacion to authenticated;

-- Resultados por opción: SOLO si la encuesta está cerrada o el que consulta es
-- gestión (evita influir en el voto en curso). Cómputo en BD, no en el cliente.
create or replace function encuesta_resultados(p_encuesta uuid)
  returns table(opcion_id uuid, texto text, votos bigint)
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
    select o.id, o.texto, count(v.id) as votos
    from encuesta_opciones o
    left join encuesta_votos v on v.opcion_id = o.id
    where o.encuesta_id = p_encuesta
    group by o.id, o.texto, o.orden
    order by o.orden;
end; $$;
grant execute on function encuesta_resultados(uuid) to authenticated;
