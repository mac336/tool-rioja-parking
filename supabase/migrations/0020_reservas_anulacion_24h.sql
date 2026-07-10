-- Reservas: solo se pueden ANULAR hasta 24 horas antes de su inicio.
-- La gestión (permiso aprobar_reservas, que incluye app_admin) puede anular
-- en cualquier momento. La regla vive en la BD (la UI solo la refleja).
-- Las reservas celebradas no se borran: quedan archivadas (historial de quién
-- usó cada zona y cuándo) y visibles en la agenda mensual del panel.
create or replace function reservas_valida_anulacion() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'cancelada' and old.estado in ('pendiente', 'aprobada') then
    if old.inicio - now() < interval '24 hours' and not puede_aprobar_reservas() then
      raise exception 'Las reservas solo pueden anularse hasta 24 horas antes de su inicio.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists reservas_anulacion_24h on reservas;
create trigger reservas_anulacion_24h before update on reservas
  for each row execute function reservas_valida_anulacion();
