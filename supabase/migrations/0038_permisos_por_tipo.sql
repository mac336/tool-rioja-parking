-- 0038 · Permisos del tablón POR TIPO + reservar para otras viviendas
-- ---------------------------------------------------------------------------
-- Fase 1 del rediseño de permisos. Añade permisos granulares (ver/publicar por
-- tipo de mensaje) y 'reservar_otras_viviendas', y siembra los defaults. NO
-- retira todavía 'publicar_mensajes' ni 'aprobar_reservas' (lo harán las fases
-- siguientes al cambiar el enforcement de mensajes y reservas).
--
-- Defaults: todos ven avisos e incidencias; anuncios y sugerencias todos MENOS
-- el conserje. La gestión publica todos los tipos; el conserje publica avisos e
-- incidencias. reservar_otras_viviendas → conserje. (app_admin = SUPERADMIN,
-- no necesita filas.)

insert into role_permissions (rol, permiso) values
  -- ver_aviso / ver_incidencia → todos menos app_admin
  ('presidente','ver_aviso'),('vicepresidente','ver_aviso'),('administrador_finca','ver_aviso'),('junta','ver_aviso'),('conserje','ver_aviso'),('vecino','ver_aviso'),('tester','ver_aviso'),
  ('presidente','ver_incidencia'),('vicepresidente','ver_incidencia'),('administrador_finca','ver_incidencia'),('junta','ver_incidencia'),('conserje','ver_incidencia'),('vecino','ver_incidencia'),('tester','ver_incidencia'),
  -- ver_anuncio / ver_sugerencia → todos menos app_admin y conserje
  ('presidente','ver_anuncio'),('vicepresidente','ver_anuncio'),('administrador_finca','ver_anuncio'),('junta','ver_anuncio'),('vecino','ver_anuncio'),('tester','ver_anuncio'),
  ('presidente','ver_sugerencia'),('vicepresidente','ver_sugerencia'),('administrador_finca','ver_sugerencia'),('junta','ver_sugerencia'),('vecino','ver_sugerencia'),('tester','ver_sugerencia'),
  -- publicar_aviso / publicar_incidencia → gestión + conserje
  ('presidente','publicar_aviso'),('vicepresidente','publicar_aviso'),('administrador_finca','publicar_aviso'),('junta','publicar_aviso'),('conserje','publicar_aviso'),
  ('presidente','publicar_incidencia'),('vicepresidente','publicar_incidencia'),('administrador_finca','publicar_incidencia'),('junta','publicar_incidencia'),('conserje','publicar_incidencia'),
  -- publicar_anuncio / publicar_sugerencia → gestión
  ('presidente','publicar_anuncio'),('vicepresidente','publicar_anuncio'),('administrador_finca','publicar_anuncio'),('junta','publicar_anuncio'),
  ('presidente','publicar_sugerencia'),('vicepresidente','publicar_sugerencia'),('administrador_finca','publicar_sugerencia'),('junta','publicar_sugerencia'),
  -- reservar para otras viviendas → conserje
  ('conserje','reservar_otras_viviendas')
on conflict do nothing;

-- Helpers RLS (para las fases 2-3; todavía no los usa ninguna política).
create or replace function puede_publicar_tipo(t text) returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('publicar_' || t); $$;

create or replace function puede_ver_tipo(t text) returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('ver_' || t); $$;

create or replace function puede_reservar_otras() returns boolean
  language sql stable security definer set search_path = public as $$ select tiene_permiso('reservar_otras_viviendas'); $$;
