-- ============================================================================
-- Rioja 25 · Funciones auxiliares y triggers de negocio
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers de autorización (SECURITY DEFINER → leen profiles sin recursión RLS).
-- Se usan en las políticas RLS (0003). Leen el profile de auth.uid() EN VIVO.
-- ---------------------------------------------------------------------------
create or replace function es_activo() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and estado = 'activo');
$$;

create or replace function rol_actual() returns user_role
  language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid();
$$;

create or replace function mi_vivienda() returns text
  language sql stable security definer set search_path = public as $$
  select vivienda from profiles where id = auth.uid();
$$;

create or replace function es_gestion() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and estado = 'activo'
    and rol in ('app_admin','presidente','vicepresidente','administrador_finca','junta')
  );
$$;

create or replace function puede_aprobar_altas() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and estado = 'activo'
    and rol in ('app_admin','presidente','administrador_finca')
  );
$$;

-- Aprobar/rechazar reservas: presidente (y app_admin como respaldo).
create or replace function puede_aprobar_reservas() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and estado = 'activo'
    and rol in ('app_admin','presidente')
  );
$$;

-- Aprobar/publicar anuncios: toda la gestión.
create or replace function puede_aprobar_anuncios() returns boolean
  language sql stable security definer set search_path = public as $$
  select es_gestion();
$$;

create or replace function es_app_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and estado = 'activo' and rol = 'app_admin'
  );
$$;

-- Bloquear/desbloquear anuncios de una vivienda: presidente, adm. finca y
-- app_admin (matriz del módulo 03). Ver finding FUNCIONAL 5.
create or replace function puede_bloquear_anuncios() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and estado = 'activo'
    and rol in ('app_admin','presidente','administrador_finca')
  );
$$;

-- Registro de auditoría (lo llaman los triggers; el cliente nunca inserta).
create or replace function log_audit(p_accion text, p_entidad text, p_entidad_id uuid, p_detalle jsonb)
  returns void language sql security definer set search_path = public as $$
  insert into audit_log(actor_id, accion, entidad, entidad_id, detalle)
  values (auth.uid(), p_accion, p_entidad, p_entidad_id, p_detalle);
$$;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_incidencias_updated before update on incidencias
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Máx. 2 cuentas por vivienda (estado activo/pendiente)
-- ---------------------------------------------------------------------------
create or replace function check_cuentas_por_vivienda() returns trigger
  language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.vivienda is null then return new; end if;
  select count(*) into n from profiles
    where vivienda = new.vivienda and estado in ('activo','pendiente')
      and id <> new.id;
  if n >= 2 then
    raise exception 'La vivienda % ya tiene 2 cuentas (máximo permitido).', new.vivienda
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

create trigger trg_cuentas_vivienda before insert or update on profiles
  for each row execute function check_cuentas_por_vivienda();

-- ---------------------------------------------------------------------------
-- Incidencias: rellenar autor + vivienda desde el profile; historial; anti-spam
-- ---------------------------------------------------------------------------
create or replace function incidencia_before_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_hoy_madrid date; n int;
begin
  -- Autor de confianza: si no viene, es el usuario actual.
  if new.autor_id is null then new.autor_id := auth.uid(); end if;
  -- Vivienda derivada del autor (no de confianza en el cliente).
  select vivienda into new.autor_vivienda from profiles where id = new.autor_id;
  -- SEGURIDAD (finding INFO): una incidencia SIEMPRE nace 'abierta'; el cliente
  -- no fija el estado ni la moderación al crear.
  new.estado := 'abierta';
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

create trigger trg_incidencia_before_insert before insert on incidencias
  for each row execute function incidencia_before_insert();

-- SEGURIDAD (finding MEDIO 3): el autor puede editar el CONTENIDO de su
-- incidencia (título, descripción, categoría, ubicación) pero NO su estado ni la
-- moderación. Cambiar estado/cerrar y ocultar/bloquear es exclusivo de gestión.
-- Si el que actualiza no es gestión, restauramos los campos reservados.
create or replace function incidencia_guard_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not es_gestion() then
    new.estado := old.estado;
    new.prioridad := old.prioridad;
    new.comentarios_bloqueados := old.comentarios_bloqueados;
  end if;
  return new;
end; $$;

create trigger trg_incidencia_guard_update before update on incidencias
  for each row execute function incidencia_guard_update();

-- Historial de estado: evento inicial al crear + evento en cada cambio.
create or replace function incidencia_evento_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into incidencia_eventos(incidencia_id, estado_anterior, estado_nuevo, actor_id)
  values (new.id, null, new.estado, new.autor_id);
  return new;
end; $$;

create trigger trg_incidencia_evento_insert after insert on incidencias
  for each row execute function incidencia_evento_insert();

create or replace function incidencia_evento_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado then
    insert into incidencia_eventos(incidencia_id, estado_anterior, estado_nuevo, actor_id)
    values (new.id, old.estado, new.estado, auth.uid());
    perform log_audit('cambio_estado', 'incidencia', new.id,
      jsonb_build_object('de', old.estado, 'a', new.estado));
  end if;
  return new;
end; $$;

create trigger trg_incidencia_evento_update after update on incidencias
  for each row execute function incidencia_evento_update();

-- ---------------------------------------------------------------------------
-- Encuestas: 1 voto por vivienda en opción_única; solo con encuesta abierta
-- ---------------------------------------------------------------------------
create or replace function voto_before_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_tipo encuesta_tipo; v_ap timestamptz; v_ci timestamptz; n int;
begin
  select tipo, apertura, cierre into v_tipo, v_ap, v_ci from encuestas where id = new.encuesta_id;
  if now() < v_ap or now() > v_ci then
    raise exception 'La encuesta no está abierta.' using errcode = 'check_violation';
  end if;
  -- SEGURIDAD (finding BAJO 4): la opción debe pertenecer a ESTA encuesta
  -- (la FK solo garantiza que la opción existe, no que sea de esta encuesta).
  if not exists (select 1 from encuesta_opciones
                 where id = new.opcion_id and encuesta_id = new.encuesta_id) then
    raise exception 'La opción no pertenece a la encuesta.' using errcode = 'check_violation';
  end if;
  if v_tipo = 'opcion_unica' then
    select count(*) into n from encuesta_votos
      where encuesta_id = new.encuesta_id and vivienda = new.vivienda;
    if n >= 1 then
      raise exception 'En una encuesta de opción única solo se puede marcar una opción por vivienda.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end; $$;

create trigger trg_voto_before_insert before insert on encuesta_votos
  for each row execute function voto_before_insert();

-- SEGURIDAD (finding BAJO 4): no se puede borrar el voto una vez cerrada la
-- encuesta (cambiar el voto solo hasta el cierre).
create or replace function voto_before_delete() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_ci timestamptz;
begin
  select cierre into v_ci from encuestas where id = old.encuesta_id;
  if v_ci is not null and now() > v_ci then
    raise exception 'La encuesta está cerrada; el voto no se puede modificar.'
      using errcode = 'check_violation';
  end if;
  return old;
end; $$;

create trigger trg_voto_before_delete before delete on encuesta_votos
  for each row execute function voto_before_delete();

-- ---------------------------------------------------------------------------
-- Reservas: una sola vigente por vivienda; auditoría de aprobación
-- ---------------------------------------------------------------------------
create or replace function reserva_una_vigente() returns trigger
  language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.estado in ('pendiente','aprobada') and new.fin >= now() then
    select count(*) into n from reservas
      where vivienda = new.vivienda
        and estado in ('pendiente','aprobada')
        and fin >= now()
        and id <> new.id;
    if n >= 1 then
      raise exception 'La vivienda % ya tiene una reserva vigente.', new.vivienda
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end; $$;

create trigger trg_reserva_una_vigente before insert or update on reservas
  for each row execute function reserva_una_vigente();

create or replace function reserva_after_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado
     and new.estado in ('aprobada','rechazada') then
    perform log_audit(new.estado::text, 'reserva', new.id,
      jsonb_build_object('zona', new.zona_id, 'vivienda', new.vivienda));
  end if;
  return new;
end; $$;

create trigger trg_reserva_after_update after update on reservas
  for each row execute function reserva_after_update();

-- ---------------------------------------------------------------------------
-- Anuncios: derivar vivienda + autor; marca revisión larga (>1 año); auditoría
-- ---------------------------------------------------------------------------
create or replace function anuncio_before_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.autor_id is null then new.autor_id := auth.uid(); end if;
  select vivienda into new.vivienda from profiles where id = new.autor_id;
  new.revision_larga := (new.fecha_fin > new.fecha_inicio + interval '1 year');
  -- SEGURIDAD (finding CRÍTICO 1): el cliente NUNCA fija estos campos. Un anuncio
  -- SIEMPRE nace 'pendiente' y sin nivel; publicar/aprobar es exclusivo de la
  -- gestión vía UPDATE (anun_upd). Sin esto, un vecino podría insertar un anuncio
  -- ya 'publicado' en el tablón principal saltándose la moderación.
  new.estado := 'pendiente';
  new.nivel := null;
  new.publicado_at := null;
  new.aprobado_por := null;
  new.motivo_rechazo := null;
  return new;
end; $$;

create trigger trg_anuncio_before_insert before insert on anuncios
  for each row execute function anuncio_before_insert();

create or replace function anuncio_after_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'publicado' and new.publicado_at is null then
      new.publicado_at := now();
    end if;
    perform log_audit(new.estado::text, 'anuncio', new.id,
      jsonb_build_object('nivel', new.nivel));
  end if;
  return new;
end; $$;

-- publicado_at se fija en BEFORE para poder mutar new
create or replace function anuncio_before_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'publicado' and old.estado <> 'publicado' and new.publicado_at is null then
    new.publicado_at := now();
    if new.nivel is null then new.nivel := new.nivel_solicitado; end if;
  end if;
  return new;
end; $$;

create trigger trg_anuncio_before_update before update on anuncios
  for each row execute function anuncio_before_update();
create trigger trg_anuncio_after_update after update on anuncios
  for each row execute function anuncio_after_update();

-- ---------------------------------------------------------------------------
-- Bloqueo de anuncios por vivienda + cambios de rol/estado → auditoría
-- ---------------------------------------------------------------------------
create or replace function profile_after_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol then
    perform log_audit('cambio_rol', 'profile', new.id,
      jsonb_build_object('de', old.rol, 'a', new.rol));
  end if;
  if new.estado is distinct from old.estado then
    perform log_audit('cambio_estado', 'profile', new.id,
      jsonb_build_object('de', old.estado, 'a', new.estado));
  end if;
  return new;
end; $$;

create trigger trg_profile_after_update after update on profiles
  for each row execute function profile_after_update();

create or replace function vivienda_after_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.puede_publicar_anuncios is distinct from old.puede_publicar_anuncios then
    perform log_audit(
      case when new.puede_publicar_anuncios then 'desbloqueo_anuncios' else 'bloqueo_anuncios' end,
      'vivienda', null, jsonb_build_object('vivienda', new.codigo));
  end if;
  return new;
end; $$;

create trigger trg_vivienda_after_update after update on viviendas
  for each row execute function vivienda_after_update();

-- ---------------------------------------------------------------------------
-- Parking: reasignación → auditoría
-- ---------------------------------------------------------------------------
create or replace function cesion_after_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'reasignada' and old.estado is distinct from 'reasignada' then
    perform log_audit('reasignada', 'parking_cesion', new.id,
      jsonb_build_object('de', new.vivienda, 'a', new.reasignada_a));
  end if;
  return new;
end; $$;

create trigger trg_cesion_after_update after update on parking_cesiones
  for each row execute function cesion_after_update();
