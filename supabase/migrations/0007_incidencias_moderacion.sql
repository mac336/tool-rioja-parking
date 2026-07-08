-- 0007 · Moderación de incidencias (aprobación previa)
-- Las incidencias que abre un vecino nacen 'pendiente' y NO son visibles para el
-- resto hasta que la gestión las aprueba ('abierta'). Rechazadas → 'rechazada'.
-- El autor siempre ve las suyas (en cualquier estado); la gestión ve todo.

-- 1) Nuevos estados en el enum (idempotente). Sin transacción envolvente para
--    poder usarlos en las sentencias siguientes (psql hace autocommit).
alter type incident_estado add value if not exists 'pendiente' before 'abierta';
alter type incident_estado add value if not exists 'rechazada' after 'cerrada';

-- 2) Alta: una incidencia SIEMPRE nace 'pendiente' (el cliente no fija estado).
create or replace function incidencia_before_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_hoy_madrid date; n int;
begin
  if new.autor_id is null then new.autor_id := auth.uid(); end if;
  select vivienda into new.autor_vivienda from profiles where id = new.autor_id;
  new.estado := 'pendiente';                 -- moderación previa (0007)
  new.comentarios_bloqueados := false;

  -- Anti-spam: máx. 5 incidencias por vivienda y día (Europe/Madrid).
  v_hoy_madrid := (now() at time zone 'Europe/Madrid')::date;
  select count(*) into n from incidencias
    where autor_vivienda = new.autor_vivienda
      and (created_at at time zone 'Europe/Madrid')::date = v_hoy_madrid;
  if n >= 5 then
    raise exception 'Límite de 5 incidencias por vivienda y día alcanzado.'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

-- 3) Visibilidad: gestión ve todo; el autor ve las suyas; el resto solo ve las
--    ya moderadas (no 'pendiente' ni 'rechazada').
drop policy if exists inc_sel on incidencias;
create policy inc_sel on incidencias for select using (
  es_activo() and (
    es_gestion()
    or autor_id = auth.uid()
    or estado not in ('pendiente','rechazada')
  )
);
