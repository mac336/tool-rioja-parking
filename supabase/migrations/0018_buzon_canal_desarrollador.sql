-- 0018 · Canal "desarrollador" en el buzón → lo atiende el app_admin
-- Para que un vecino pueda reportar problemas/ideas de la APP directamente al
-- desarrollador (administrador de la app), en privado.
alter type hilo_canal add value if not exists 'desarrollador' after 'conserje';

-- Actualiza la visibilidad por canal para incluir el nuevo.
create or replace function puede_ver_hilo(c hilo_canal) returns boolean
  language sql stable security definer set search_path = public as $$
  select es_activo() and case c
    when 'administrador'  then rol_actual() = 'administrador_finca'
    when 'presidencia'    then rol_actual() in ('presidente', 'vicepresidente')
    when 'conserje'       then rol_actual() = 'conserje'
    when 'desarrollador'  then rol_actual() = 'app_admin'
    else false
  end;
$$;
