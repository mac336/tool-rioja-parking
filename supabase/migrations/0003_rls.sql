-- ============================================================================
-- Rioja 25 · Row-Level Security (RLS)
-- Regla de oro: acceso a datos de comunidad exige estado='activo'. Todo se
-- aplica aquí, no en la interfaz. Ver specs/03 (matriz) y specs/11 (seguridad).
-- ============================================================================

-- Activar + forzar RLS en TODAS las tablas.
alter table viviendas               enable row level security;
alter table profiles                enable row level security;
alter table access_requests         enable row level security;
alter table incidencias             enable row level security;
alter table incidencia_adjuntos     enable row level security;
alter table incidencia_comentarios  enable row level security;
alter table incidencia_eventos      enable row level security;
alter table encuestas               enable row level security;
alter table encuesta_preguntas      enable row level security;
alter table encuesta_opciones       enable row level security;
alter table encuesta_votos          enable row level security;
alter table zonas_comunes           enable row level security;
alter table reservas                enable row level security;
alter table parking_cesiones        enable row level security;
alter table anuncios                enable row level security;
alter table contactos               enable row level security;
alter table reportes                enable row level security;
alter table audit_log               enable row level security;

alter table profiles                force row level security;
alter table incidencias             force row level security;
alter table reservas                force row level security;
alter table anuncios                force row level security;
alter table encuesta_votos          force row level security;

-- Grants base (RLS sigue gateando fila a fila). anon solo lee el catálogo de viviendas.
grant usage on schema public to anon, authenticated;
grant select on viviendas to anon, authenticated;
grant select, insert, update, delete on
  incidencias, incidencia_adjuntos, incidencia_comentarios,
  encuestas, encuesta_preguntas, encuesta_opciones, encuesta_votos,
  zonas_comunes, reservas, parking_cesiones, anuncios, contactos, reportes
  to authenticated;
grant select on incidencia_eventos, audit_log to authenticated;
grant select, insert, update, delete on access_requests to authenticated;
-- profiles: lectura + inserción por servicio; el usuario solo edita 2 columnas.
grant select, insert on profiles to authenticated;
grant update (nombre, normas_aceptadas_at) on profiles to authenticated;
-- viviendas: por API solo se puede tocar el flag de bloqueo de anuncios (nivel de
-- columna). El resto del catálogo (codigo/orden) se cambia por migración/servicio.
grant update (puede_publicar_anuncios) on viviendas to authenticated;

-- ---------------------------------------------------------------------------
-- Alta automática de perfil al registrarse (magic link / Google) → pendiente.
-- La aprobación (Edge Function) actualizará vivienda/rol/estado.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, nombre, estado)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'pendiente')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- viviendas
-- ---------------------------------------------------------------------------
create policy viviendas_sel on viviendas for select using (true);
-- La gestión con permiso (presidente/adm. finca/app_admin) puede actualizar
-- viviendas; el grant de columna limita ese UPDATE a `puede_publicar_anuncios`,
-- así que en la práctica solo pueden bloquear/desbloquear anuncios (finding 5).
create policy viviendas_upd on viviendas for update
  using (puede_bloquear_anuncios()) with check (puede_bloquear_anuncios());
create policy viviendas_ins on viviendas for insert with check (es_app_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_sel_own on profiles for select using (id = auth.uid() or es_gestion());
create policy profiles_upd_own on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- inserción manual solo servicio (service_role bypassa RLS); ningún insert para authenticated.

-- ---------------------------------------------------------------------------
-- access_requests  (inserción solo vía Edge Function con service_role)
-- ---------------------------------------------------------------------------
create policy requests_sel on access_requests for select using (puede_aprobar_altas());
create policy requests_upd on access_requests for update using (puede_aprobar_altas()) with check (puede_aprobar_altas());

-- ---------------------------------------------------------------------------
-- incidencias
-- ---------------------------------------------------------------------------
create policy inc_sel on incidencias for select using (es_activo());
create policy inc_ins on incidencias for insert with check (es_activo());
create policy inc_upd_autor on incidencias for update
  using (autor_id = auth.uid() and estado = 'abierta')
  with check (autor_id = auth.uid() and estado = 'abierta');
create policy inc_upd_gestion on incidencias for update using (es_gestion()) with check (es_gestion());
create policy inc_del on incidencias for delete using (autor_id = auth.uid() or es_app_admin());

-- adjuntos
create policy adj_sel on incidencia_adjuntos for select using (es_activo());
create policy adj_ins on incidencia_adjuntos for insert with check (es_activo() and subido_por = auth.uid());
create policy adj_del on incidencia_adjuntos for delete using (subido_por = auth.uid() or es_app_admin());

-- comentarios
create policy com_sel on incidencia_comentarios for select
  using (es_activo() and (not oculto or autor_id = auth.uid() or es_gestion()));
create policy com_ins on incidencia_comentarios for insert with check (
  es_activo() and autor_id = auth.uid()
  and exists (select 1 from incidencias i where i.id = incidencia_id and not i.comentarios_bloqueados)
);
create policy com_upd_gestion on incidencia_comentarios for update using (es_gestion()) with check (es_gestion());
create policy com_del on incidencia_comentarios for delete using (autor_id = auth.uid() or es_app_admin());

-- eventos: solo lectura (los escribe el trigger como definer)
create policy evt_sel on incidencia_eventos for select using (es_activo());

-- ---------------------------------------------------------------------------
-- encuestas / opciones / votos
-- ---------------------------------------------------------------------------
create policy enc_sel on encuestas for select using (es_activo());
create policy enc_all on encuestas for all using (es_gestion()) with check (es_gestion());

create policy preg_sel on encuesta_preguntas for select using (es_activo());
create policy preg_all on encuesta_preguntas for all using (es_gestion()) with check (es_gestion());

create policy opt_sel on encuesta_opciones for select using (es_activo());
create policy opt_all on encuesta_opciones for all using (es_gestion()) with check (es_gestion());

create policy voto_sel on encuesta_votos for select using (vivienda = mi_vivienda() or es_app_admin());
create policy voto_ins on encuesta_votos for insert
  with check (es_activo() and vivienda = mi_vivienda() and emitido_por = auth.uid());
create policy voto_del on encuesta_votos for delete using (vivienda = mi_vivienda());

-- ---------------------------------------------------------------------------
-- zonas_comunes
-- ---------------------------------------------------------------------------
create policy zonas_sel on zonas_comunes for select using (es_activo());
create policy zonas_all on zonas_comunes for all using (es_app_admin()) with check (es_app_admin());

-- ---------------------------------------------------------------------------
-- reservas  (vecinos NO ven filas de otras viviendas → usan vista de ocupación)
-- ---------------------------------------------------------------------------
create policy res_sel on reservas for select using (vivienda = mi_vivienda() or es_gestion());
create policy res_ins on reservas for insert
  with check (es_activo() and vivienda = mi_vivienda() and solicitada_por = auth.uid());
-- El solicitante puede editar su reserva pendiente o CANCELARLA, pero NUNCA
-- fijar 'aprobada'/'rechazada' (eso es del presidente): el WITH CHECK limita el
-- estado resultante a pendiente/cancelada.
create policy res_upd_own on reservas for update
  using (solicitada_por = auth.uid() and estado in ('pendiente','aprobada'))
  with check (solicitada_por = auth.uid() and estado in ('pendiente','cancelada'));
create policy res_upd_gestion on reservas for update
  using (puede_aprobar_reservas()) with check (puede_aprobar_reservas());
create policy res_del on reservas for delete using (solicitada_por = auth.uid() or es_app_admin());

-- ---------------------------------------------------------------------------
-- parking_cesiones
-- ---------------------------------------------------------------------------
create policy ces_sel on parking_cesiones for select using (es_activo());
create policy ces_ins on parking_cesiones for insert with check (es_activo() and vivienda = mi_vivienda());
-- El dueño solo puede CANCELAR su cesión activa; NUNCA reasignarla (eso es de la
-- gestión, con prioridad por fecha — specs/08). El WITH CHECK impide fijar
-- 'reasignada' o rellenar reasignada_a/gestionada_por. Ver finding MEDIO 2.
create policy ces_upd_own on parking_cesiones for update
  using (vivienda = mi_vivienda() and estado = 'activa')
  with check (vivienda = mi_vivienda()
              and estado in ('activa','cancelada')
              and reasignada_a is null
              and gestionada_por is null);
create policy ces_upd_gestion on parking_cesiones for update using (es_gestion()) with check (es_gestion());
create policy ces_del on parking_cesiones for delete using (es_app_admin());

-- ---------------------------------------------------------------------------
-- anuncios
-- ---------------------------------------------------------------------------
create policy anun_sel on anuncios for select using (
  es_activo() and (
    (estado = 'publicado' and current_date between fecha_inicio and fecha_fin)
    or autor_id = auth.uid()
    or es_gestion()
  )
);
create policy anun_ins on anuncios for insert with check (
  es_activo()
  and exists (select 1 from viviendas v where v.codigo = mi_vivienda() and v.puede_publicar_anuncios)
);
create policy anun_upd on anuncios for update
  using (es_gestion() or (autor_id = auth.uid() and estado = 'pendiente'))
  with check (es_gestion() or (autor_id = auth.uid() and estado = 'pendiente'));
create policy anun_del on anuncios for delete using (autor_id = auth.uid() or es_app_admin());

-- ---------------------------------------------------------------------------
-- contactos
-- ---------------------------------------------------------------------------
create policy con_sel on contactos for select using (es_activo());
create policy con_all on contactos for all
  using (es_activo() and rol_actual() in ('administrador_finca','app_admin'))
  with check (es_activo() and rol_actual() in ('administrador_finca','app_admin'));

-- ---------------------------------------------------------------------------
-- reportes
-- ---------------------------------------------------------------------------
create policy rep_sel on reportes for select using (autor_id = auth.uid() or es_gestion());
create policy rep_ins on reportes for insert with check (es_activo() and autor_id = auth.uid());
create policy rep_upd on reportes for update using (es_gestion()) with check (es_gestion());

-- ---------------------------------------------------------------------------
-- audit_log  (solo lectura app_admin; escritura solo definer/servicio)
-- ---------------------------------------------------------------------------
create policy audit_sel on audit_log for select using (es_app_admin());
