-- 0064 · Consejos de convivencia en el hueco de la Home (v1.59.0)
-- ---------------------------------------------------------------------------
-- La Home es un panel SIN scroll y, según el móvil y lo que haya en el tablón,
-- queda un hueco vacío entre el tablón y Servicios. Se aprovecha para recordar
-- NORMAS REALES de la comunidad (acta 2026, normas de zonas comunes de 2013,
-- specs/08 y specs/15), no frases genéricas.
--
-- Editables desde Gestión: añadir o retocar un consejo no debe exigir un
-- despliegue. Dos versiones por consejo (corta y larga) para encajar en 1 o 2
-- líneas según el hueco que tenga cada usuario.

create table if not exists consejos_convivencia (
  id           uuid primary key default gen_random_uuid(),
  texto_corto  text not null check (char_length(texto_corto) between 1 and 120),
  texto_largo  text check (texto_largo is null or char_length(texto_largo) <= 240),
  icono        text,                      -- clave de lucide (Car, Moon, Waves…)
  orden        smallint not null default 100,
  activo       boolean not null default true,
  -- Ventana de temporada opcional, en formato 'MM-DD'. Sirve para los consejos
  -- de piscina (solo del 13-06 al 13-09) o para cualquier otro estacional.
  visible_desde text check (visible_desde is null or visible_desde ~ '^\d{2}-\d{2}$'),
  visible_hasta text check (visible_hasta is null or visible_hasta ~ '^\d{2}-\d{2}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_consejos_orden on consejos_convivencia(activo, orden);

alter table consejos_convivencia enable row level security;
revoke all on consejos_convivencia from anon, authenticated;
grant select on consejos_convivencia to authenticated;
grant all on consejos_convivencia to service_role;

-- Verlos: cualquier vecino activo. Gestionarlos: permiso propio.
insert into role_permissions (rol, permiso) values
  ('presidente','gestionar_consejos'), ('vicepresidente','gestionar_consejos'),
  ('administrador_finca','gestionar_consejos'), ('junta','gestionar_consejos')
on conflict do nothing;

drop policy if exists consejos_sel on consejos_convivencia;
create policy consejos_sel on consejos_convivencia for select using (es_activo());

drop policy if exists consejos_ins on consejos_convivencia;
create policy consejos_ins on consejos_convivencia for insert
  with check (es_activo() and not es_tester() and tiene_permiso('gestionar_consejos'));

drop policy if exists consejos_upd on consejos_convivencia;
create policy consejos_upd on consejos_convivencia for update
  using (es_activo() and not es_tester() and tiene_permiso('gestionar_consejos'));

drop policy if exists consejos_del on consejos_convivencia;
create policy consejos_del on consejos_convivencia for delete
  using (es_activo() and not es_tester() and tiene_permiso('gestionar_consejos'));

grant insert, update, delete on consejos_convivencia to authenticated;

drop trigger if exists trg_consejos_updated_at on consejos_convivencia;
create trigger trg_consejos_updated_at before update on consejos_convivencia
  for each row execute function mensajes_set_updated_at();

-- ---- Catálogo inicial: TODO sale de normas escritas de la comunidad --------
insert into consejos_convivencia (texto_corto, texto_largo, icono, orden, visible_desde, visible_hasta) values
  ('Las plazas exteriores van por turnos.',
   'Las plazas exteriores van por turnos quincenales. Aparcar en la de otro vecino deja a alguien sin sitio.', 'Car', 10, null, null),
  ('Solo turismos en las plazas exteriores.',
   'Las 6 plazas exteriores son solo para turismos: no caben furgonetas ni camiones.', 'Car', 20, null, null),
  ('Los cambios de turno de parking, hasta el sábado a las 20:00.', null, 'Car', 30, null, null),
  ('Prohibido jugar al fútbol en la entrada y la rampa del garaje.', null, 'Ban', 40, null, null),
  ('Espera a que la puerta del garaje cierre del todo antes de alejarte.', null, 'DoorClosed', 50, null, null),
  ('En el exterior, sin ruido a partir de las 23:00.',
   'No se autorizan celebraciones exteriores más allá de las 23:00. Hay una residencia a menos de 150 m.', 'Moon', 60, null, null),
  ('Poner una toalla encima de una silla no la reserva.',
   'La comunidad pone sillas y mesas para todos: dejar enseres encima no da derecho de reserva.', 'Armchair', 70, null, null),
  ('Recoge tus sillas, tumbonas y juguetes al terminar.',
   'El mobiliario particular se recoge tras usarlo y no puede quedarse encadenado a nada.', 'Armchair', 80, null, null),
  ('Tus invitados pueden usar las zonas comunes, siempre acompañados por ti.',
   'Quien invita es responsable de sus invitados, que deben ir acompañados en todo momento.', 'Users', 90, null, null),
  ('Dúchate antes de entrar al agua.', null, 'Waves', 100, '06-01', '09-20'),
  ('Fuera del horario de baño no hay socorrista: no se puede bañar nadie.',
   'El baño está permitido solo en el horario establecido, que es cuando hay socorrista.', 'Waves', 110, '06-01', '09-20'),
  ('¿Una celebración? Pídela al conserje con 5 días de antelación.',
   'Las zonas comunes se reservan a través del conserje, con al menos 5 días de antelación.', 'PartyPopper', 120, null, null),
  ('Si no vas a usar tu reserva, anúlala con 24 h y que la aproveche otro.', null, 'CalendarDays', 130, null, null),
  ('Toda reserva tiene un responsable de posibles desperfectos.', null, 'CalendarDays', 140, null, null),
  ('En el tablón y los comentarios: sin insultos ni ataques personales.',
   'La app sustituye a los avisos en papel. Sin ataques personales ni contenido ofensivo.', 'MessageCircle', 150, null, null)
on conflict do nothing;
