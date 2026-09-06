-- 0057 · Purga automática de festivos pasados (calendario_eventos)
-- ---------------------------------------------------------------------------
-- Decisión del usuario 2026-09-06 (specs/21-modulo-calendario.md § Ciclo de
-- vida y relaciones): "No quiero fechas antiguas. Quiero que si ya pasó el
-- festivo lo borres directamente." Los festivos (tipo='festivo') que ya
-- pasaron se BORRAN FÍSICAMENTE sin intervención de nadie, igual que ya se
-- hizo a mano en producción para los 8 festivos de 2026 ya pasados.
--
-- Los eventos de tipo='comunidad' NUNCA se tocan: pasan a la sección
-- "Pasados" como histórico y se conservan indefinidamente (el usuario: "Si es
-- de la comunidad sí se pueden quedar las fechas").
--
-- "Pasado" = coalesce(fecha_fin, fecha) < hoy, con HOY en Europe/Madrid (no
-- en UTC: el servidor está en UTC y a las 00:00-02:00 de Madrid la fecha UTC
-- todavía es la del día anterior; usar current_date a secas habría borrado
-- festivos un día tarde/pronto según la hora del cron).
--
-- Mismo patrón que purgar_cesiones() (0030_purga_cesiones.sql): función SQL
-- `security definer set search_path = public`, sin permiso de ejecución para
-- el cliente (solo la tarea programada la llama), y job de pg_cron
-- reprogramable sin duplicar.
create extension if not exists pg_cron;

create or replace function purgar_festivos_pasados() returns integer
  language sql security definer set search_path = public as $$
  with del as (
    delete from calendario_eventos
    where tipo = 'festivo'
      and coalesce(fecha_fin, fecha) < (now() at time zone 'Europe/Madrid')::date
    returning 1
  )
  select count(*)::int from del;
$$;

-- Solo la tarea programada la ejecuta (no el cliente).
revoke execute on function purgar_festivos_pasados() from public, anon, authenticated;

-- Job diario (03:25, para no coincidir con purgar_cesiones a las 03:15).
-- Reprogramable sin duplicar.
do $$
begin
  perform cron.unschedule('purgar_festivos_pasados');
exception when others then null;
end $$;

select cron.schedule('purgar_festivos_pasados', '25 3 * * *', 'select purgar_festivos_pasados();');
