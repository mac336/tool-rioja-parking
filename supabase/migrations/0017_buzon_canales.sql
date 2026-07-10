-- 0017 · Buzón por canales privados dirigidos
-- El vecino elige a quién escribe. El hilo es privado entre el vecino y los roles
-- del canal (nadie más lo ve, ni siquiera app_admin — privacidad estricta):
--   administrador → rol 'administrador_finca'
--   presidencia   → roles 'presidente' y 'vicepresidente'
--   conserje      → rol 'conserje'

do $$ begin
  create type hilo_canal as enum ('administrador', 'presidencia', 'conserje');
exception when duplicate_object then null; end $$;

alter table hilos add column if not exists canal hilo_canal not null default 'administrador';

-- ¿El usuario actual (activo) pertenece al canal indicado?
create or replace function puede_ver_hilo(c hilo_canal) returns boolean
  language sql stable security definer set search_path = public as $$
  select es_activo() and case c
    when 'administrador' then rol_actual() = 'administrador_finca'
    when 'presidencia'   then rol_actual() in ('presidente', 'vicepresidente')
    when 'conserje'      then rol_actual() = 'conserje'
    else false
  end;
$$;

-- Visibilidad de hilos: su dueño (vecino) o los roles del canal.
drop policy if exists hilo_sel on hilos;
create policy hilo_sel on hilos for select using (vecino_id = auth.uid() or puede_ver_hilo(canal));
drop policy if exists hilo_upd on hilos;
create policy hilo_upd on hilos for update
  using (vecino_id = auth.uid() or puede_ver_hilo(canal))
  with check (vecino_id = auth.uid() or puede_ver_hilo(canal));
-- hilo_ins (crear) se mantiene: el vecino crea su propio hilo (canal a su elección).

-- Mensajes del hilo: visibles/insertables si el hilo es visible para ti.
drop policy if exists hm_sel on hilo_mensajes;
create policy hm_sel on hilo_mensajes for select using (
  exists (select 1 from hilos h where h.id = hilo_id and (h.vecino_id = auth.uid() or puede_ver_hilo(h.canal)))
);
drop policy if exists hm_ins on hilo_mensajes;
create policy hm_ins on hilo_mensajes for insert with check (
  es_activo() and autor_id = auth.uid()
  and exists (select 1 from hilos h where h.id = hilo_id and (h.vecino_id = auth.uid() or puede_ver_hilo(h.canal)))
);

-- de_gestion = lo escribe alguien que NO es el vecino dueño (es decir, el canal).
create or replace function hilo_mensaje_before_insert() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := coalesce(new.autor_id, auth.uid());
  new.de_gestion := new.autor_id <> (select vecino_id from hilos where id = new.hilo_id);
  return new;
end; $$;
