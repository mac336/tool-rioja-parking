-- 0039 · Reservas de aprobación directa (Fase 2)
-- ---------------------------------------------------------------------------
-- Se elimina el flujo de aprobación: al crear, la reserva queda 'aprobada'.
-- Las pendientes actuales pasan a aprobadas. Se retira el permiso
-- 'aprobar_reservas'. Nuevo permiso 'reservar_otras_viviendas' (creado en 0038)
-- permite reservar a nombre de otra vivienda. La anulación con menos de 24h la
-- puede forzar la gestión (es_gestion) en vez del antiguo aprobador.

-- 1) La regla de anulación 24h ya no depende de 'aprobar_reservas'.
create or replace function reservas_valida_anulacion() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'cancelada' and old.estado in ('pendiente', 'aprobada') then
    if old.inicio - now() < interval '24 hours' and not es_gestion() then
      raise exception 'Las reservas solo pueden anularse hasta 24 horas antes de su inicio.';
    end if;
  end if;
  return new;
end $$;

-- 2) Fuera la política de aprobación por gestión y la función del permiso.
drop policy if exists res_upd_gestion on reservas;
drop function if exists puede_aprobar_reservas();

-- 3) Aprobación directa: default 'aprobada' y migrar las pendientes.
alter table reservas alter column estado set default 'aprobada';
update reservas set estado = 'aprobada' where estado = 'pendiente';

-- 4) Insert: requiere permiso de realizar reservas; permite reservar a nombre de
--    otra vivienda solo con 'reservar_otras_viviendas'.
drop policy if exists res_ins on reservas;
create policy res_ins on reservas for insert
  with check (
    es_activo()
    and tiene_permiso('realizar_reservas')
    and solicitada_por = auth.uid()
    and (vivienda = mi_vivienda() or puede_reservar_otras())
  );

-- 5) El solicitante puede cancelar su reserva (estado resultante aprobada/cancelada).
drop policy if exists res_upd_own on reservas;
create policy res_upd_own on reservas for update
  using (solicitada_por = auth.uid() and estado = 'aprobada')
  with check (solicitada_por = auth.uid() and estado in ('aprobada', 'cancelada'));

-- 6) Retirar el permiso de aprobar reservas (ya no existe el flujo).
delete from role_permissions where permiso = 'aprobar_reservas';
